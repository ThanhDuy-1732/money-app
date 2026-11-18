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

export function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) return null

  return (
    <div className="space-y-3 border-t border-border pt-3">
      {comments.map(comment => (
        <div key={comment.id} className="flex gap-2.5">
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
            <p className="text-sm text-foreground">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
