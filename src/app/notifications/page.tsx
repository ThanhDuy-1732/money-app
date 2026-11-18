import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationList } from '@/features/notifications/components/NotificationList'
import { PageHeader } from '@/components/ui'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader
        title="Thông báo"
        description="Hoạt động mới từ bạn bè, ví điểm và cửa hàng."
      />
      <NotificationList initialItems={notifications ?? []} userId={user.id} />
    </main>
  )
}
