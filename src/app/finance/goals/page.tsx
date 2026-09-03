import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listSavingsGoals } from '@/features/finance/savings.actions'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const goals = await listSavingsGoals()

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">Mục tiêu tiết kiệm</h1>
      {goals.length === 0 && (
        <p className="text-center text-gray-400 py-8">Chưa có mục tiêu nào.</p>
      )}
      {goals.map((g: any) => {
        const pct = Math.min((g.current_amount / g.target_amount) * 100, 100)
        return (
          <div key={g.id} className="border rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{g.name}</p>
                {g.target_date && (
                  <p className="text-xs text-gray-400">Hạn: {g.target_date}</p>
                )}
              </div>
              {g.achieved_at && <span className="text-green-500 text-sm">✅ Đạt mục tiêu</span>}
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-gray-500">
              {g.current_amount.toLocaleString('vi-VN')}đ / {g.target_amount.toLocaleString('vi-VN')}đ ({pct.toFixed(0)}%)
            </p>
          </div>
        )
      })}
    </main>
  )
}
