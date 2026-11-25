'use client'
import { useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { Avatar } from '@/components/ui'
import type { Database } from '@/lib/types/database'

dayjs.extend(relativeTime)
dayjs.locale('vi')

type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
}

const COLLAPSED_COUNT = 2

export function CommentList({ comments }: { comments: Comment[] }) {
  const [expanded, setExpanded] = useState(false)

  if (comments.length === 0) return null

  const hiddenCount = comments.length - COLLAPSED_COUNT
  const visible = expanded || hiddenCount <= 0 ? comments : comments.slice(-COLLAPSED_COUNT)

  return (
    <div className="border-t border-border pt-3">
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          aria-expanded={expanded}
          className="mb-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          {expanded ? 'Thu gọn bình luận' : `Xem tất cả ${comments.length} bình luận`}
        </button>
      )}
      <div className="space-y-3">
        {visible.map(comment => (
          <div key={comment.id} className="animate-rise flex gap-2.5">
            <Avatar
              src={comment.profiles.avatar_url}
              fallback={comment.profiles.display_name}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold">{comment.profiles.display_name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {dayjs(comment.created_at).fromNow()}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                {comment.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
