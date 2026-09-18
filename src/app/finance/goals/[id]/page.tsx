import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listGoalMembers } from '@/features/finance/savings.actions'
import { GoalMemberList } from '@/features/finance/components/GoalMemberList'
import { ContributeForm } from '@/features/finance/components/ContributeForm'
import Link from 'next/link'

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: goal } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('id', id)
    .single()

  if (!goal) notFound()

  // Check access: owner or member
  // ponytail: cast needed — savings_goal_members not in generated types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase as any)
    .from('savings_goal_members')
    .select('user_id')
    .eq('goal_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isOwner = goal.user_id === user.id
  if (!isOwner && !membership) notFound()

  const { members } = await listGoalMembers(id)
  const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <Link href="/finance/goals" className="text-sm text-blue-500">← Mục tiêu</Link>
        <h1 className="text-xl font-bold mt-1">{goal.name}</h1>
        {goal.target_date && <p className="text-xs text-gray-400">Hạn: {goal.target_date}</p>}
        {goal.achieved_at && <span className="text-green-500 text-sm">✅ Đạt mục tiêu</span>}
      </div>

      <div className="space-y-1">
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-gray-500">
          {goal.current_amount.toLocaleString('vi-VN')}đ / {goal.target_amount.toLocaleString('vi-VN')}đ ({pct.toFixed(0)}%)
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm text-zinc-600 uppercase tracking-wide">Thành viên</h2>
        <GoalMemberList goalId={goal.id} members={members} isOwner={isOwner} />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-sm text-zinc-600 uppercase tracking-wide">Góp tiền</h2>
        <ContributeForm goalId={goal.id} />
      </section>
    </main>
  )
}
