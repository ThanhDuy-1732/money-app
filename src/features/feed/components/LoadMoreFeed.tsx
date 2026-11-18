'use client'
import { useEffect, useRef, useState } from 'react'
import { fetchFeedPage } from '../actions/feed.actions'
import { PostCard } from './PostCard'
import type { Database } from '@/lib/types/database'

type FeedPost = Database['public']['Tables']['posts']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
  comments: Array<
    Database['public']['Tables']['comments']['Row'] & {
      profiles: { display_name: string; avatar_url: string | null }
    }
  >
}

export function LoadMoreFeed({
  initialCursor,
  userId,
  followingOnly,
}: {
  initialCursor: string | null
  userId?: string
  followingOnly: boolean
}) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState(initialCursor)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(!initialCursor)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (done) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) loadMore()
      },
      { rootMargin: '200px' }
    )
    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, loading, done])

  async function loadMore() {
    if (!cursor || loading) return
    setLoading(true)
    const { posts: next, nextCursor } = await fetchFeedPage(cursor, userId ?? null, followingOnly)
    setPosts(prev => [...prev, ...(next as FeedPost[])])
    if (!nextCursor) setDone(true)
    else setCursor(nextCursor)
    setLoading(false)
  }

  return (
    <>
      {posts.map(post => (
        <PostCard key={post.id} post={post} currentUserId={userId} />
      ))}
      {!done && (
        <div ref={sentinelRef} className="py-4 text-center text-sm text-muted-foreground">
          {loading ? 'Đang tải thêm...' : ''}
        </div>
      )}
    </>
  )
}
