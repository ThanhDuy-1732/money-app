import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationList } from '@/features/notifications/components/NotificationList'

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
    <main className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Thông báo</h1>
      <NotificationList initialItems={notifications ?? []} userId={user.id} />
    </main>
  )
}
