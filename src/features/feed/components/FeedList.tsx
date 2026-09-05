import { fetchFeedPage } from '../actions/feed.actions'
import { PostCard } from './PostCard'
import { LoadMoreFeed } from './LoadMoreFeed'
import type { Database } from '@/lib/types/database'

type FeedPost = Database['public']['Tables']['posts']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
  comments: Array<Database['public']['Tables']['comments']['Row'] & {
    profiles: { display_name: string; avatar_url: string | null }
  }>
}

export async function FeedList({
  userId,
  followingOnly = false,
}: {
  userId?: string
  followingOnly?: boolean
}) {
  const { posts, nextCursor } = await fetchFeedPage(null, userId ?? null, followingOnly)

  if (!posts.length) {
    return <p className="text-center text-gray-400 py-8">Chưa có bài đăng nào.</p>
  }

  return (
    <div className="space-y-4">
      {(posts as FeedPost[]).map(post => (
        <PostCard key={post.id} post={post} currentUserId={userId} />
      ))}
      {userId && <LoadMoreFeed initialCursor={nextCursor} userId={userId} followingOnly={followingOnly} />}
    </div>
  )
}
