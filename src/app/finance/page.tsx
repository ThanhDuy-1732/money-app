import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listTransactions } from '@/features/finance/transaction.actions'
import { MonthPicker } from '@/features/finance/components/MonthPicker'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function isValidMonth(s: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s)
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
    typeof rawMonth === 'string' && isValidMonth(rawMonth)
      ? rawMonth
      : currentMonth()

  const [{ transactions, totalIncome, totalExpense }, { isPremium }] = await Promise.all([
    listTransactions(month),
    getSubscriptionStatus(),
  ])

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <MonthPicker month={month} />
        <div className="flex gap-2">
          {isPremium && (
            <Link href="/finance/trends" className="px-3 py-2 border rounded-lg text-sm text-zinc-600">
              📈 Xu hướng
            </Link>
          )}
          <Link href="/finance/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            + Thêm giao dịch
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-xl p-4">
          <p className="text-sm text-gray-500">Thu nhập</p>
          <p className="text-lg font-bold text-green-600">+{totalIncome.toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="border rounded-xl p-4">
          <p className="text-sm text-gray-500">Chi tiêu</p>
          <p className="text-lg font-bold text-red-600">-{totalExpense.toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      <div className="space-y-2">
        {transactions.length === 0 && (
          <p className="text-center text-gray-400 py-8">Chưa có giao dịch nào tháng này.</p>
        )}
        {transactions.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between border rounded-lg p-3">
            <div>
              <span className="mr-2">{t.categories?.icon ?? '📦'}</span>
              <span className="text-sm">{t.categories?.name ?? 'Không phân loại'}</span>
              {t.note && <p className="text-xs text-gray-400 ml-6">{t.note}</p>}
            </div>
            <span className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {t.type === 'income' ? '+' : '-'}{t.amount_vnd.toLocaleString('vi-VN')}đ
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
