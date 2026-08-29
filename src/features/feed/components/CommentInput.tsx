'use client'
import { useState } from 'react'
import { createComment } from '../actions/feed.actions'
import { Input, Button } from '@/components/ui'

export function CommentInput({ postId }: { postId: string }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    await createComment(postId, content)
    setContent('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <Input
        placeholder="Bình luận..."
        value={content}
        onChange={e => setContent(e.target.value)}
        maxLength={300}
        className="flex-1 h-8 text-sm"
      />
      <Button type="submit" size="sm" disabled={loading || !content.trim()}>Gửi</Button>
    </form>
  )
}
