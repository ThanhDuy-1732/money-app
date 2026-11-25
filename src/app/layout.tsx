import type { Metadata } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'
import { Toaster, ToastProvider } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'
import { AppNav } from '@/components/AppNav'
import { signOut } from '@/features/auth/actions/auth.actions'
import { recordLogin } from '@/features/profile/actions/streak.actions'

const font = Be_Vietnam_Pro({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700', '800'], variable: '--font-be-vietnam' })

export const metadata: Metadata = {
  title: 'Money App',
  description: 'Social + điểm thưởng',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await recordLogin()

  let isAdmin = false
  let balance = 0
  let streak = 0
  let unreadCount = 0
  if (user) {
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from('profiles').select('role, points_balance, streak_count').eq('id', user.id).single(),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
    ])
    isAdmin = profile?.role === 'admin'
    balance = profile?.points_balance ?? 0
    streak = profile?.streak_count ?? 0
    unreadCount = count ?? 0
  }

  return (
    <html lang="vi">
      <body className={font.className}>
        <ToastProvider>
          {user && (
            <AppNav
              balance={balance}
              streak={streak}
              isAdmin={isAdmin}
              signOutAction={signOut}
              unreadCount={unreadCount}
              userId={user.id}
            />
          )}
          <div className={user ? 'min-h-screen pb-20 pt-14 md:pb-0 md:pl-60 md:pt-0' : 'min-h-screen'}>{children}</div>
          <Toaster />
        </ToastProvider>
      </body>
    </html>
  )
}
