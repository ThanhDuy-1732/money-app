import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BalanceCard } from '@/features/wallet/components/BalanceCard'
import { LedgerTable } from '@/features/wallet/components/LedgerTable'
import Link from 'next/link'
import { Button } from '@/components/ui'

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: ledger }] = await Promise.all([
    supabase.from('profiles').select('points_balance, streak_count').eq('id', user.id).single(),
    supabase.from('points_ledger').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
  ])

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <BalanceCard balance={profile?.points_balance ?? 0} streak={profile?.streak_count ?? 0} />
      <div className="flex justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/wallet/topup">Nạp điểm</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/redeem">Đổi điểm</Link>
        </Button>
      </div>
      <section>
        <h2 className="text-lg font-semibold mb-2">Lịch sử</h2>
        <LedgerTable rows={ledger ?? []} />
      </section>
    </main>
  )
}
