import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getOrCreateReferralCode, getReferralStats } from '@/features/referral/actions/referral.actions'
import { InviteLink } from '@/features/referral/components/InviteLink'
import { ReferralLeaderboard } from '@/features/referral/components/ReferralLeaderboard'

export default async function InvitePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ code }, stats] = await Promise.all([getOrCreateReferralCode(), getReferralStats()])

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">Mời bạn bè</h1>
      <p className="text-sm text-gray-600">Mời bạn tham gia — bạn nhận 100đ, người được mời nhận 50đ khi đăng bài đầu tiên.</p>
      {code && <InviteLink code={code} />}
      <div className="rounded-lg border p-4 space-y-1">
        <p className="text-sm text-gray-600">Đã mời: <strong data-testid="referral-total">{stats.total}</strong> người</p>
        <p className="text-sm text-gray-600">Hoàn thành: <strong>{stats.completed} người</strong></p>
        <p className="text-sm text-gray-600">Điểm thưởng đã nhận: <strong>{stats.pointsEarned} điểm</strong></p>
        <p className="text-xs text-gray-400">Bạn nhận 100đ khi người được mời đăng bài đầu tiên.</p>
      </div>
      <ReferralLeaderboard />
    </main>
  )
}
