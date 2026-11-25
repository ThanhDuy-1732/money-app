'use client'
import { useState } from 'react'
import { Check } from 'lucide-react'
import { createComment } from '../actions/feed.actions'
import { Button, Input } from '@/components/ui'

export function CommentInput({
  postId,
  inputId,
  demo = false,
  onSubmitted,
}: {
  postId: string
  inputId?: string
  demo?: boolean
  onSubmitted?: () => void
}) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || loading) return
    setLoading(true)

    if (demo) {
      await new Promise(resolve => setTimeout(resolve, 400))
    } else {
      const result = await createComment(postId, content)
      if (result?.error) {
        setLoading(false)
        return
      }
    }

    setContent('')
    setLoading(false)
    setSent(true)
    onSubmitted?.()
    setTimeout(() => setSent(false), 1600)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Input
          id={inputId}
          placeholder="Bình luận..."
          aria-label="Nội dung bình luận"
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={300}
          className="h-9 pr-16 text-sm"
        />
        {sent && (
          <span className="animate-rise absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            <Check className="h-3 w-3" /> Đã gửi
          </span>
        )}
      </div>
      <Button type="submit" size="sm" loading={loading} disabled={loading || !content.trim()}>
        Gửi
      </Button>
    </form>
  )
}
