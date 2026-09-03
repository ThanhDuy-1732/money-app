import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { signOut } from '@/features/auth/actions/auth.actions'
import { recordLogin } from '@/features/profile/actions/streak.actions'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Money App',
  description: 'Social + điểm thưởng',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) await recordLogin()

  return (
    <html lang="vi">
      <body className={inter.className}>
        <ToastProvider>
          {user && (
            <nav className="sticky top-0 z-40 border-b bg-white px-4 py-3 flex items-center justify-between">
              <Link href="/feed" className="font-bold text-blue-600">MoneyApp</Link>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/feed">Feed</Link>
                <Link href="/explore">Khám phá</Link>
                <Link href="/wallet">Ví</Link>
                <Link href="/finance">💰 Tài chính</Link>
                <Link href="/notes">📝 Ghi chú</Link>
                <Link href="/todos">✅ To-do</Link>
                <Link href="/billing/upgrade">⭐ Premium</Link>
                <Link href="/invite">Mời bạn</Link>
                <Link href="/notifications">🔔</Link>
                <Link href="/profile">Hồ sơ</Link>
                <form action={signOut}><button type="submit" className="text-gray-400 hover:text-gray-600">Đăng xuất</button></form>
              </div>
            </nav>
          )}
          <div className="min-h-screen">{children}</div>
        </ToastProvider>
      </body>
    </html>
  )
}
