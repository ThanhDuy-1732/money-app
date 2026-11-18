import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import {
  Circle,
  CreditCard,
  Flame,
  Gift,
  PenLine,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Target,
  UserRoundCheck,
  type LucideIcon,
} from 'lucide-react'
import { Amount, EmptyState, Serial } from '@/components/ui'
import type { Database } from '@/lib/types/database'

dayjs.extend(relativeTime)
dayjs.locale('vi')

type LedgerRow = Database['public']['Tables']['points_ledger']['Row']

const REASON_META: Record<string, { label: string; icon: LucideIcon }> = {
  signup: { label: 'Đăng ký', icon: Sparkles },
  profile_complete: { label: 'Hoàn thiện hồ sơ', icon: UserRoundCheck },
  streak: { label: 'Đăng nhập hàng ngày', icon: Flame },
  post: { label: 'Đăng bài', icon: PenLine },
  referral_in: { label: 'Được mời', icon: Gift },
  referral_out: { label: 'Mời bạn thành công', icon: Gift },
  redeem: { label: 'Đổi điểm', icon: ShoppingBag },
  adjustment: { label: 'Điều chỉnh', icon: SlidersHorizontal },
  topup: { label: 'Nạp điểm VNPay', icon: CreditCard },
  subscription_points: { label: 'Nâng cấp Premium', icon: Star },
  shop_purchase_points: { label: 'Mua hàng', icon: Store },
  savings_goal_achieved: { label: 'Đạt mục tiêu tiết kiệm', icon: Target },
}

const FALLBACK = { label: 'Giao dịch điểm', icon: Circle }

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Chưa có giao dịch"
        description="Nạp điểm hoặc đăng bài để bắt đầu tích điểm."
      />
    )
  }

  const groups = new Map<string, LedgerRow[]>()
  for (const row of rows) {
    const key = dayjs(row.created_at).format('DD/MM/YYYY')
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([date, items]) => (
        <div key={date}>
          <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {date}
          </p>
          <div className="divide-y divide-border rounded-lg border border-border bg-card px-3">
            {items.map(row => {
              const meta = REASON_META[row.reason_code] ?? FALLBACK
              const Icon = meta.icon
              return (
                <div key={row.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{meta.label}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Serial value={row.id} />
                      <span>·</span>
                      <span>{dayjs(row.created_at).fromNow()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Amount
                      value={row.delta}
                      kind="points"
                      sign={row.delta > 0 ? 'plus' : 'minus'}
                      tone={row.delta > 0 ? 'leaf' : 'lotus'}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Số dư {row.balance_after.toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
