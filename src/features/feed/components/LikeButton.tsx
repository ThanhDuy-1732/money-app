'use client'
import { useState } from 'react'
import { likePost, unlikePost } from '../actions/feed.actions'
import { Button } from '@/components/ui'

export function LikeButton({
  postId, initialCount, initialLiked,
}: { postId: string; initialCount: number; initialLiked: boolean }) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)

  async function toggle() {
    const prev = { liked, count }
    const next = !liked
    setLiked(next)
    setCount(c => c + (next ? 1 : -1))
    const result = next ? await likePost(postId) : await unlikePost(postId)
    if (result?.error) {
      setLiked(prev.liked)
      setCount(prev.count)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-1 text-gray-500">
      {liked ? '❤️' : '🤍'} {count}
    </Button>
  )
}
