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
    const next = !liked
    setLiked(next)
    setCount(c => c + (next ? 1 : -1))
    if (next) await likePost(postId)
    else await unlikePost(postId)
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} className="gap-1 text-gray-500">
      {liked ? '❤️' : '🤍'} {count}
    </Button>
  )
}
