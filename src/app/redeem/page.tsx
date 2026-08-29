import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RedeemCard } from '@/features/wallet/components/RedeemCard'

export default async function RedeemPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: rewards }] = await Promise.all([
    supabase.from('profiles').select('points_balance').eq('id', user.id).single(),
    supabase.from('rewards').select('*').eq('active', true).order('points_cost'),
  ])

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Đổi điểm</h1>
        <span className="text-sm text-gray-600">Số dư: <strong>{profile?.points_balance ?? 0}đ</strong></span>
      </div>
      {rewards?.map(reward => (
        <RedeemCard key={reward.id} reward={reward} userBalance={profile?.points_balance ?? 0} />
      ))}
    </main>
  )
}
