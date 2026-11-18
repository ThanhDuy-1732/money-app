import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getOrCreateReferralCode, getReferralStats } from '@/features/referral/actions/referral.actions'
import { InviteLink } from '@/features/referral/components/InviteLink'
import { ReferralLeaderboard } from '@/features/referral/components/ReferralLeaderboard'
import {
  Amount,
  Card,
  CardBody,
  PageHeader,
  SecurityThread,
  Stamp,
  Stat,
} from '@/components/ui'

export default async function InvitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ code }, stats] = await Promise.all([getOrCreateReferralCode(), getReferralStats()])

  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader
        title="Mời bạn"
        description="Mời bạn tham gia — cả hai cùng nhận điểm."
      />

      <Card tone="coin" className="relative overflow-hidden">
        <SecurityThread className="absolute right-6 top-0 h-full -rotate-6" />
        <CardBody className="space-y-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-micro font-bold uppercase tracking-[0.16em] text-primary">
                Giới thiệu
              </p>
              <h2 className="mt-1 text-h2 font-extrabold tracking-tight">
                Mời bạn, cả hai nhận điểm
              </h2>
            </div>
            <Stamp status="+100" tone="coin" />
          </div>
          <p className="text-sm text-muted-foreground">
            Bạn nhận 100 điểm, người được mời nhận 50 điểm khi đăng bài đầu tiên.
          </p>
          {code && <InviteLink code={code} />}
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Đã mời"
          value={<strong data-testid="referral-total">{stats.total}</strong>}
        />
        <Stat label="Hoàn thành" value={stats.completed} tone="leaf" />
        <Stat
          label="Điểm đã nhận"
          value={<Amount value={stats.pointsEarned} kind="points" tone="coin" size="stat" />}
        />
      </div>

      <ReferralLeaderboard />
    </main>
  )
}
