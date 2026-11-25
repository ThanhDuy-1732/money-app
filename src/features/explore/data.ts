import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { createClient } from '@/lib/supabase/server'
import { POST_AUTHOR_EMBED } from '@/features/feed/post-select'
import { listProducts } from '@/features/shop/actions/shop.actions'
import type {
  ExploreData,
  ExplorePerson,
  ExplorePost,
  ExploreReward,
  ExploreTopic,
} from './types'

dayjs.extend(relativeTime)
dayjs.locale('vi')

const TOPICS: ExploreTopic[] = [
  { label: 'Tiết kiệm', query: 'tiết kiệm' },
  { label: 'Quỹ khẩn cấp', query: 'khẩn cấp' },
  { label: 'Đầu tư', query: 'đầu tư' },
  { label: 'Streak', query: 'streak' },
  { label: 'Trả nợ', query: 'nợ' },
  { label: 'Voucher', query: 'voucher' },
  { label: 'Lương tháng 13', query: 'lương' },
  { label: 'Thói quen', query: 'thói quen' },
]

type PostRow = {
  id: string
  content: string | null
  created_at: string
  like_count: number
  comment_count: number
  profiles: { display_name: string; avatar_url: string | null } | null
}

type ProfileRow = {
  id: string
  display_name: string
  username: string | null
  avatar_url: string | null
  streak_count: number | null
  points_balance: number | null
}

export function toExplorePost(row: PostRow): ExplorePost {
  return {
    id: row.id,
    content: row.content?.trim() || 'Bài viết mới từ cộng đồng.',
    timeLabel: dayjs(row.created_at).fromNow(),
    likeCount: row.like_count,
    commentCount: row.comment_count,
    author: row.profiles ?? { display_name: 'Người dùng MoneyApp', avatar_url: null },
  }
}

function toExplorePerson(row: ProfileRow, followingIds: Set<string>): ExplorePerson {
  return {
    id: row.id,
    display_name: row.display_name,
    username: row.username,
    avatar_url: row.avatar_url,
    streak_count: row.streak_count ?? 0,
    points_balance: row.points_balance ?? 0,
    isFollowing: followingIds.has(row.id),
  }
}

function toReward(row: {
  id: string
  title?: string | null
  price_points?: number | null
  image_url?: string | null
  shop_partners?: { name?: string | null } | Array<{ name?: string | null }> | null
}): ExploreReward | null {
  if (!row.price_points || !row.title) return null
  const partner = Array.isArray(row.shop_partners)
    ? row.shop_partners[0]
    : row.shop_partners
  return {
    id: row.id,
    title: row.title,
    pricePoints: row.price_points,
    partnerName: partner?.name ?? null,
    imageUrl: row.image_url ?? null,
  }
}

export async function getExploreData(userId?: string): Promise<ExploreData> {
  const supabase = await createClient()

  const followingIds = new Set<string>()
  if (userId) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    for (const row of follows ?? []) followingIds.add(row.following_id)
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const exclude = userId ? [userId, ...followingIds] : [...followingIds]

  let peopleQuery = supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url, streak_count, points_balance')
    .order('points_balance', { ascending: false })
    .limit(5)
  if (exclude.length > 0) {
    peopleQuery = peopleQuery.not('id', 'in', `(${exclude.join(',')})`)
  }

  const [
    { data: rawPosts },
    { data: rawPeople },
    { data: rawLeaders },
    { count: members },
    { count: postsToday },
    { count: streakHolders },
    products,
  ] = await Promise.all([
    supabase
      .from('posts')
      .select(`id, content, created_at, like_count, comment_count, ${POST_AUTHOR_EMBED}`)
      .eq('hidden', false)
      .is('deleted_at', null)
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(7),
    peopleQuery,
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, streak_count, points_balance')
      .order('streak_count', { ascending: false })
      .limit(5),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('hidden', false)
      .is('deleted_at', null)
      .gte('created_at', startOfDay.toISOString()),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('streak_count', 0),
    listProducts(),
  ])

  const posts = ((rawPosts ?? []) as PostRow[]).map(toExplorePost)
  const people = ((rawPeople ?? []) as ProfileRow[]).map(row =>
    toExplorePerson(row, followingIds)
  )
  const leaders = ((rawLeaders ?? []) as ProfileRow[]).map(row => ({
    id: row.id,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    streak_count: row.streak_count ?? 0,
  }))

  const rewards = (products as Parameters<typeof toReward>[0][])
    .map(toReward)
    .filter((reward): reward is ExploreReward => reward !== null)
    .slice(0, 4)

  const [featured, ...rest] = posts

  return {
    featured: featured ?? null,
    posts: rest,
    people,
    rewards,
    topics: TOPICS,
    leaders,
    stats: {
      members: members ?? 0,
      postsToday: postsToday ?? 0,
      streakToday: streakHolders ?? 0,
    },
  }
}
