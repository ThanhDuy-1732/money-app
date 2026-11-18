import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RealtimeBalance } from '@/features/wallet/components/RealtimeBalance'
import { WalletLedger } from '@/features/wallet/components/WalletLedger'
import { Button, PageHeader, Section } from '@/components/ui'

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: ledger }] = await Promise.all([
    supabase.from('profiles').select('points_balance, streak_count').eq('id', user.id).single(),
    supabase
      .from('points_ledger')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader title="Ví điểm" description="Số dư và lịch sử điểm thưởng của bạn." />

      <RealtimeBalance
        userId={user.id}
        initialBalance={profile?.points_balance ?? 0}
        streak={profile?.streak_count ?? 0}
      />

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/wallet/topup">Nạp điểm</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/redeem">Đổi quà</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href="/invite">Mời bạn</Link>
        </Button>
      </div>

      <Section title="Lịch sử điểm">
        <WalletLedger rows={ledger ?? []} />
      </Section>
    </main>
  )
}
