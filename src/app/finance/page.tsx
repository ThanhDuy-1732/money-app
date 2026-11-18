import { redirect } from 'next/navigation'
import Link from 'next/link'
import dayjs from 'dayjs'
import { createClient } from '@/lib/supabase/server'
import { listTransactions } from '@/features/finance/transaction.actions'
import { MonthPicker } from '@/features/finance/components/MonthPicker'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'
import { currentMonthIso } from '@/lib/date'
import {
  Amount,
  Button,
  CategoryIcon,
  EmptyState,
  PageHeader,
  Serial,
  Stat,
} from '@/components/ui'

function isValidMonth(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
}

type TransactionRow = {
  id: string
  type: 'income' | 'expense'
  amount_vnd: number
  note: string | null
  occurred_at: string
  categories: { name: string; icon: string | null } | null
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { month: rawMonth } = await searchParams
  const month =
    typeof rawMonth === 'string' && isValidMonth(rawMonth) ? rawMonth : currentMonthIso()

  const [{ transactions, totalIncome, totalExpense }, { isPremium }] = await Promise.all([
    listTransactions(month),
    getSubscriptionStatus(),
  ])

  const rows = transactions as TransactionRow[]
  const groups = new Map<string, TransactionRow[]>()
  for (const row of rows) {
    const key = dayjs(row.occurred_at).format('DD/MM/YYYY')
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  const monthLabel = dayjs(`${month}-01`).format('MM/YYYY')

  return (
    <main className="mx-auto max-w-default space-y-6 px-4 py-6">
      <PageHeader
        title="Tài chính"
        description="Theo dõi thu chi theo tháng."
        actions={
          <>
            <MonthPicker month={month} />
            <Button asChild>
              <Link href="/finance/new">Thêm giao dịch</Link>
            </Button>
            {isPremium && (
              <Button asChild variant="outline">
                <Link href="/finance/trends">Xu hướng</Link>
              </Button>
            )}
          </>
        }
      />

      <div data-testid="finance-summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat
          label="Thu nhập"
          value={
            <Amount value={totalIncome} kind="vnd" sign="plus" tone="leaf" size="stat" />
          }
          delta={`Tháng ${monthLabel}`}
        />
        <Stat
          label="Chi tiêu"
          value={
            <Amount value={totalExpense} kind="vnd" sign="minus" tone="lotus" size="stat" />
          }
          delta={`Tháng ${monthLabel}`}
        />
      </div>

      <div data-testid="transaction-ledger" className="space-y-4">
        {rows.length === 0 ? (
          <EmptyState
            title="Chưa có giao dịch tháng này"
            description="Thêm giao dịch đầu tiên để bắt đầu theo dõi."
            action={
              <Button asChild>
                <Link href="/finance/new">Thêm giao dịch</Link>
              </Button>
            }
          />
        ) : (
          [...groups.entries()].map(([date, items]) => (
            <div key={date}>
              <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {date}
              </p>
              <div className="divide-y divide-border rounded-lg border border-border bg-card px-3">
                {items.map(row => (
                  <div key={row.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <CategoryIcon
                        icon={row.categories?.icon ?? null}
                        className="h-4 w-4 text-primary"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 break-words text-sm font-semibold">
                        {row.categories?.name ?? 'Không phân loại'}
                      </p>
                      {row.note && (
                        <p className="truncate text-xs text-muted-foreground">{row.note}</p>
                      )}
                      <Serial value={row.id} className="mt-0.5" />
                    </div>
                    <Amount
                      value={row.amount_vnd}
                      kind="vnd"
                      sign={row.type === 'income' ? 'plus' : 'minus'}
                      tone={row.type === 'income' ? 'leaf' : 'lotus'}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
