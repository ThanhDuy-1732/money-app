import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionStatus, subscribeWithPoints } from '@/features/billing/subscription.actions'
import { PREMIUM_POINTS_COST } from '@/lib/constants/limits'
import {
  Badge,
  Button,
  Card,
  CardBody,
  PageHeader,
  SecurityThread,
  Stamp,
} from '@/components/ui'

const BENEFITS = [
  'Không giới hạn ngân sách/tháng',
  'Không giới hạn mục tiêu tiết kiệm',
  'Không giới hạn ghi chú',
  'Không giới hạn to-do đang hoạt động',
  'Mở khóa xu hướng tài chính',
]

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { isPremium, expiresAt } = await getSubscriptionStatus()

  const { data: profile } = await supabase
    .from('profiles')
    .select('points_balance')
    .eq('id', user.id)
    .single()

  const canAfford = (profile?.points_balance ?? 0) >= PREMIUM_POINTS_COST

  const params = await searchParams
  const error = params.error

  async function handleSubscribeWithPoints() {
    'use server'
    const result = await subscribeWithPoints()
    if (result.error) {
      redirect(`/billing/upgrade?error=${encodeURIComponent(result.error)}`)
    }
    redirect('/billing/upgrade')
  }

  return (
    <main className="mx-auto max-w-narrow space-y-6 px-4 py-6">
      <PageHeader
        title="Nâng cấp Premium"
        description="Mở giới hạn và mở khóa xu hướng tài chính."
      />

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      {isPremium ? (
        <Card tone="coin">
          <CardBody className="space-y-1 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Bạn đang dùng Premium</p>
              <Badge variant="leaf">Đang hoạt động</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Hết hạn: {expiresAt?.toLocaleDateString('vi-VN')}
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Gói Free</p>
              <Badge variant="neutral">Hiện tại</Badge>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li>3 ngân sách/tháng</li>
              <li>1 mục tiêu tiết kiệm</li>
              <li>50 ghi chú</li>
              <li>20 to-do đang hoạt động</li>
            </ul>
          </CardBody>
        </Card>
      )}

      <Card className="relative overflow-hidden">
        <SecurityThread className="absolute right-6 top-0 h-full -rotate-6" />
        <CardBody className="space-y-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-micro font-bold uppercase tracking-[0.16em] text-primary">
                Premium · 30 ngày
              </p>
              <h2 className="mt-1 text-h2 font-extrabold tracking-tight">
                Không giới hạn tính năng
              </h2>
            </div>
            <Stamp status="Premium" tone="coin" />
          </div>

          <ul className="space-y-2 text-sm text-muted-foreground">
            {BENEFITS.map(benefit => (
              <li key={benefit} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {benefit}
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground">
            Số dư: {profile?.points_balance ?? 0} điểm
            {!canAfford &&
              ` · cần thêm ${PREMIUM_POINTS_COST - (profile?.points_balance ?? 0)} điểm`}
          </p>

          <form action={handleSubscribeWithPoints}>
            <Button type="submit" variant="coin" fullWidth disabled={!canAfford}>
              Dùng {PREMIUM_POINTS_COST} điểm
            </Button>
          </form>

          <Button asChild variant="outline" fullWidth>
            <Link href="/wallet/topup">Nạp điểm để nâng cấp</Link>
          </Button>
        </CardBody>
      </Card>
    </main>
  )
}
