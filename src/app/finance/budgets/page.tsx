import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listBudgets, getBudgetProgress } from '@/features/finance/budget.actions'

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const month = new Date().toISOString().slice(0, 7)
  const budgets = await listBudgets(month)
  const withProgress = await Promise.all(
    budgets.map(async (b: any) => {
      const { spent, limit } = await getBudgetProgress(b.category_id, month)
      return { ...b, spent, pct: limit > 0 ? Math.min((spent / limit) * 100, 100) : 0 }
    })
  )

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Ngân sách tháng {month}</h1>
      {withProgress.length === 0 && (
        <p className="text-center text-gray-400 py-8">Chưa có ngân sách nào.</p>
      )}
      {withProgress.map((b: any) => (
        <div key={b.id} className="border rounded-xl p-4 space-y-2">
          <div className="flex justify-between">
            <span>{b.categories?.icon} {b.categories?.name}</span>
            <span className="text-sm text-gray-500">
              {b.spent.toLocaleString('vi-VN')}đ / {b.limit_amount.toLocaleString('vi-VN')}đ
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${b.pct >= 100 ? 'bg-red-500' : b.pct >= 80 ? 'bg-yellow-400' : 'bg-green-500'}`}
              style={{ width: `${b.pct}%` }}
            />
          </div>
          {b.pct >= 80 && (
            <p className="text-xs text-red-500">
              {b.pct >= 100 ? '⚠️ Đã vượt ngân sách!' : '⚠️ Sắp đạt giới hạn'}
            </p>
          )}
        </div>
      ))}
    </main>
  )
}
