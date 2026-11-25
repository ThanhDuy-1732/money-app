import Link from 'next/link'
import { fetchFeedPage } from '../actions/feed.actions'
import { PostCard } from './PostCard'
import { LoadMoreFeed } from './LoadMoreFeed'
import { Button, EmptyState } from '@/components/ui'
import type { Database } from '@/lib/types/database'

type FeedPost = Database['public']['Tables']['posts']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
  comments: Array<
    Database['public']['Tables']['comments']['Row'] & {
      profiles: { display_name: string; avatar_url: string | null }
    }
  >
}

export async function FeedList({
  userId,
  followingOnly = false,
  authorId,
}: {
  userId?: string
  followingOnly?: boolean
  authorId?: string
}) {
  const { posts, nextCursor } = await fetchFeedPage(null, userId ?? null, followingOnly, authorId)

  if (!posts.length) {
    return (
      <EmptyState
        title="Chưa có bài đăng"
        description="Theo dõi vài người hoặc đăng bài đầu tiên để bắt đầu."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/explore">Tìm người để theo dõi</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="feed-rise space-y-4">
      {(posts as FeedPost[]).map(post => (
        <PostCard key={post.id} post={post} currentUserId={userId} />
      ))}
      {userId && (
        <LoadMoreFeed
          initialCursor={nextCursor}
          userId={userId}
          followingOnly={followingOnly}
          authorId={authorId}
        />
      )}
    </div>
  )
}
