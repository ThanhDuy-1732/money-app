'use client'
import { useState } from 'react'
import { createComment } from '../actions/feed.actions'
import { Button, Input } from '@/components/ui'

export function CommentInput({ postId, inputId }: { postId: string; inputId?: string }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || loading) return
    setLoading(true)
    await createComment(postId, content)
    setContent('')
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        id={inputId}
        placeholder="Bình luận..."
        aria-label="Nội dung bình luận"
        value={content}
        onChange={e => setContent(e.target.value)}
        maxLength={300}
        className="h-9 flex-1 text-sm"
      />
      <Button type="submit" size="sm" loading={loading} disabled={loading || !content.trim()}>
        Gửi
      </Button>
    </form>
  )
}
