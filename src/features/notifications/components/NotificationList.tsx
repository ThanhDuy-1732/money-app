'use client'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import {
  Bell,
  Coins,
  Gift,
  Heart,
  ListChecks,
  MessageCircle,
  Store,
  UserPlus,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { markAllAsRead } from '../actions/notifications.actions'
import { markAllRead } from '../mark-all'
import { Button, EmptyState, Segmented } from '@/components/ui'
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
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  follow: UserPlus,
  like: Heart,
  comment: MessageCircle,
  points: Coins,
  referral: Gift,
  finance: WalletCards,
  todo: ListChecks,
  shop: Store,
}

const TAB_GROUPS: Record<string, string[]> = {
  'Tất cả': [],
  'Xã hội': ['follow', 'like', 'comment', 'referral'],
  'Tài chính': ['finance', 'points'],
  'Công việc': ['todo'],
  'Shop': ['shop'],
}

const TABS = Object.keys(TAB_GROUPS).map(tab => ({ value: tab, label: tab }))

export function NotificationList({
  initialItems,
  userId,
}: {
  initialItems: Notification[]
  userId: string
}) {
  const [items, setItems] = useState(initialItems)
  const [activeTab, setActiveTab] = useState('Tất cả')
  const [marking, setMarking] = useState(false)

  async function handleMarkAll() {
    setMarking(true)
    setItems(prev => markAllRead(prev))
    await markAllAsRead()
    setMarking(false)
  }

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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const filtered =
    activeTab === 'Tất cả'
      ? items
      : items.filter(item => TAB_GROUPS[activeTab]?.includes(item.type))

  return (
    <div className="space-y-4">
      <Segmented options={TABS} value={activeTab} onValueChange={setActiveTab} />

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleMarkAll} loading={marking}>
          Đánh dấu đã đọc
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Chưa có thông báo"
          description="Hoạt động mới từ bạn bè, ví điểm và cửa hàng sẽ xuất hiện ở đây."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map(notification => {
            const Icon = TYPE_ICONS[notification.type] ?? Bell
            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 rounded-lg border border-border p-3 ${
                  notification.read_at ? 'bg-card' : 'bg-secondary'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{TYPE_LABELS[notification.type] ?? notification.type}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dayjs(notification.created_at).fromNow()}
                  </p>
                </div>
                {!notification.read_at && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
