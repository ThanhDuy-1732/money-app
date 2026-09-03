import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionStatus, subscribeWithPoints } from '@/features/billing/subscription.actions'
import { PREMIUM_POINTS_COST } from '@/lib/constants/limits'

export default async function UpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { isPremium, expiresAt } = await getSubscriptionStatus()

  const { data: profile } = await supabase
    .from('profiles').select('points_balance').eq('id', user.id).single()

  const canAfford = (profile?.points_balance ?? 0) >= PREMIUM_POINTS_COST

  async function handleSubscribeWithPoints() {
    'use server'
    const result = await subscribeWithPoints()
    if (!result.error) redirect('/billing/upgrade')
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Nâng cấp Premium</h1>

      {isPremium ? (
        <div className="border border-green-200 bg-green-50 dark:bg-green-950 rounded-xl p-4">
          <p className="font-semibold text-green-700 dark:text-green-300">✅ Bạn đang dùng Premium</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Hết hạn: {expiresAt?.toLocaleDateString('vi-VN')}
          </p>
        </div>
      ) : (
        <div className="border rounded-xl p-4 space-y-2">
          <p className="font-semibold">Gói Free</p>
          <ul className="text-sm text-gray-500 space-y-1 list-disc list-inside">
            <li>Tối đa 3 ngân sách/tháng</li>
            <li>Tối đa 1 mục tiêu tiết kiệm</li>
            <li>Tối đa 50 ghi chú</li>
            <li>Tối đa 20 to-do đang hoạt động</li>
          </ul>
        </div>
      )}

      <div className="border rounded-xl p-5 space-y-4">
        <div>
          <h2 className="font-bold text-lg">Premium — 30 ngày</h2>
          <p className="text-sm text-gray-500">Không giới hạn tất cả tính năng</p>
        </div>

        <form action={handleSubscribeWithPoints}>
          <button
            type="submit"
            disabled={!canAfford}
            className="w-full py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Dùng {PREMIUM_POINTS_COST} điểm
            {!canAfford && ` (thiếu ${PREMIUM_POINTS_COST - (profile?.points_balance ?? 0)} điểm)`}
          </button>
        </form>

        <Link
          href="/wallet/topup"
          className="block w-full py-3 rounded-xl font-semibold text-center border border-blue-600 text-blue-600 hover:bg-blue-50"
        >
          Nạp tiền qua VNPay (19.000đ)
        </Link>
      </div>
    </main>
  )
}
