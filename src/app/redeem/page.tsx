import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RedeemCard } from '@/features/wallet/components/RedeemCard'
import { EmptyState, PageHeader } from '@/components/ui'

export default async function RedeemPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: rewards }] = await Promise.all([
    supabase.from('profiles').select('points_balance').eq('id', user.id).single(),
    supabase.from('rewards').select('*').eq('active', true).order('points_cost'),
  ])

  return (
    <main className="mx-auto max-w-default space-y-6 px-4 py-6">
      <PageHeader
        title="Đổi điểm"
        description="Dùng điểm để đổi quà từ cửa hàng."
        meta={
          <span>
            Số dư: <strong className="text-foreground">{profile?.points_balance ?? 0} điểm</strong>
          </span>
        }
      />

      {rewards?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {rewards.map(reward => (
            <RedeemCard
              key={reward.id}
              reward={reward}
              userBalance={profile?.points_balance ?? 0}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có quà để đổi"
          description="Cửa hàng sẽ sớm cập nhật phần thưởng mới."
        />
      )}
    </main>
  )
}
