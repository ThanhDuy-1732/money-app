// src/app/admin/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { AdminTabs } from '@/components/AdminTabs'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/feed')

  return (
    <div className="mx-auto max-w-wide space-y-6 px-4 py-6">
      <PageHeader
        title="Quản trị"
        description="Quản lý người dùng, nội dung và cửa hàng."
      />
      <AdminTabs />
      <div>{children}</div>
    </div>
  )
}
