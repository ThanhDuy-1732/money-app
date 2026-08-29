import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getOrCreateReferralCode, getReferralStats } from '@/features/referral/actions/referral.actions'
import { InviteLink } from '@/features/referral/components/InviteLink'
import { ReferralStatus } from '@/features/referral/components/ReferralStatus'

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
      <ReferralStatus total={stats.total} rewarded={stats.rewarded} />
    </main>
  )
}
