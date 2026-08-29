import { createClient } from '@/lib/supabase/server'
import { PostCard } from './PostCard'

export async function FeedList({ userId, followingOnly = false }: { userId?: string; followingOnly?: boolean }) {
  const supabase = await createClient()

  let query = supabase
    .from('posts')
    .select(`
      *,
      profiles(display_name, avatar_url),
      comments(*, profiles(display_name, avatar_url))
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (followingOnly && userId) {
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    const ids = [userId, ...(following?.map(f => f.following_id) ?? [])]
    query = query.in('user_id', ids)
  }

  const { data: posts } = await query
  if (!posts?.length) return <p className="text-center text-gray-400 py-8">Chưa có bài đăng nào.</p>
  const typedPosts = posts as any[]

  return (
    <div className="space-y-4">
      {typedPosts.map(post => <PostCard key={post.id} post={post} currentUserId={userId} />)}
    </div>
  )
}
