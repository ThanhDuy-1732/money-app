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
  finance: 'cập nhật tài chính',
  todo: 'nhắc nhở công việc',
  shop: 'đơn hàng shop',
  gift: 'bạn vừa nhận điểm tặng',
}

const TAB_GROUPS: Record<string, string[]> = {
  'Tất cả': [],
  'Xã hội': ['follow', 'like', 'comment', 'referral'],
  'Tài chính': ['finance', 'points', 'gift'],
  'Công việc': ['todo'],
  'Shop': ['shop'],
}

export function NotificationList({ initialItems, userId }: { initialItems: Notification[]; userId: string }) {
  const [items, setItems] = useState(initialItems)
  const [activeTab, setActiveTab] = useState('Tất cả')

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

  const filtered = activeTab === 'Tất cả'
    ? items
    : items.filter(n => TAB_GROUPS[activeTab]?.includes(n.type))

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Object.keys(TAB_GROUPS).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 text-gray-600 hover:border-blue-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>Đánh dấu đã đọc</Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Chưa có thông báo.</p>
      ) : (
        <div className="space-y-1">
          {filtered.map(n => (
            <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${n.read_at ? '' : 'bg-blue-50 dark:bg-blue-950'}`}>
              <div className="flex-1">
                <p className="text-sm">{TYPE_LABELS[n.type] ?? n.type}</p>
                <p className="text-xs text-gray-400 mt-0.5">{dayjs(n.created_at).fromNow()}</p>
              </div>
              {!n.read_at && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
