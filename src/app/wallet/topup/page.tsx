import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TopupForm } from '@/features/wallet/components/TopupForm'
import Link from 'next/link'

export default async function TopupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="max-w-md mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/wallet" className="text-sm text-muted-foreground hover:underline">← Ví điểm</Link>
        <h1 className="text-2xl font-bold mt-2">Nạp điểm</h1>
        <p className="text-sm text-muted-foreground mt-1">1.000 VNĐ = 1 điểm</p>
      </div>
      <TopupForm />
    </main>
  )
}
