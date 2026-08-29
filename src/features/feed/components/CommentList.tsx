import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import type { Database } from '@/lib/types/database'
dayjs.extend(relativeTime)
dayjs.locale('vi')

type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
}

export function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) return null
  return (
    <div className="space-y-2 mt-2">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2 text-sm">
          <span className="font-medium">{c.profiles.display_name}</span>
          <span className="text-gray-700 flex-1">{c.content}</span>
          <span className="text-gray-400 text-xs">{dayjs(c.created_at).fromNow()}</span>
        </div>
      ))}
    </div>
  )
}
