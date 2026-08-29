'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { markAllAsRead } from '../actions/notifications.actions'
import { Button } from '@/components/ui'
import type { Database } from '@/lib/types/database'

dayjs.extend(relativeTime)
dayjs.locale('vi')

type Notification = Database['public']['Tables']['notifications']['Row']

const TYPE_LABELS: Record<string, string> = {
  follow: 'đã theo dõi bạn',
  like: 'đã thích bài viết của bạn',
  comment: 'đã bình luận bài viết của bạn',
  points: 'bạn vừa nhận điểm thưởng',
  referral: 'bạn bè đã tham gia qua lời mời của bạn',
}

export function NotificationList({ initialItems, userId }: { initialItems: Notification[]; userId: string }) {
  const [items, setItems] = useState(initialItems)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        payload => setItems(prev => [payload.new as Notification, ...prev])
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  if (items.length === 0) return <p className="text-center text-gray-400 py-8">Chưa có thông báo.</p>

  return (
    <div className="space-y-1">
      <div className="flex justify-end mb-2">
        <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>Đánh dấu đã đọc</Button>
      </div>
      {items.map(n => (
        <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${n.read_at ? '' : 'bg-blue-50'}`}>
          <div className="flex-1">
            <p className="text-sm">{TYPE_LABELS[n.type] ?? n.type}</p>
            <p className="text-xs text-gray-400">{dayjs(n.created_at).fromNow()}</p>
          </div>
          {!n.read_at && <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 shrink-0" />}
        </div>
      ))}
    </div>
  )
}
