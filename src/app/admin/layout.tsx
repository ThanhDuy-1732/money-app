// src/app/admin/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/feed')

  return (
    <div className="min-h-screen flex">
      <aside className="w-48 border-r bg-gray-50 dark:bg-gray-900 p-4 space-y-2 shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Admin</p>
        <Link href="/admin" className="block text-sm py-1 hover:text-blue-600">Dashboard</Link>
        <Link href="/admin/users" className="block text-sm py-1 hover:text-blue-600">Người dùng</Link>
        <Link href="/admin/posts" className="block text-sm py-1 hover:text-blue-600">Bài đăng</Link>
        <Link href="/admin/shop" className="block text-sm py-1 hover:text-blue-600">Shop</Link>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  )
}
