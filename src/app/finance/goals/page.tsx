import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listSavingsGoals } from '@/features/finance/savings.actions'
import { Amount, Card, CardBody, EmptyState, PageHeader, Progress, Stamp } from '@/components/ui'

type Goal = {
  id: string
  name: string
  target_amount: number
  current_amount: number
  target_date: string | null
  achieved_at: string | null
}

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const goals = await listSavingsGoals()
  const rows = goals as Goal[]

  return (
    <main className="mx-auto max-w-default space-y-6 px-4 py-6">
      <PageHeader
        title="Mục tiêu tiết kiệm"
        description="Theo dõi tiến độ từng mục tiêu."
        backHref="/finance"
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Chưa có mục tiêu"
          description="Mục tiêu tiết kiệm của bạn sẽ xuất hiện ở đây."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(goal => {
            const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100)

            return (
              <Card key={goal.id} data-testid="goal-card">
                <CardBody className="space-y-3 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{goal.name}</p>
                      {goal.target_date && (
                        <p className="text-xs text-muted-foreground">
                          Hạn: {new Date(goal.target_date).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                    {goal.achieved_at && <Stamp status="Đạt mục tiêu" tone="leaf" />}
                  </div>

                  <Progress value={pct} tone={goal.achieved_at ? 'coin' : 'leaf'} />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Đã tiết kiệm</span>
                    <Amount value={goal.current_amount} kind="vnd" tone="leaf" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Mục tiêu</span>
                    <Amount value={goal.target_amount} kind="vnd" />
                  </div>

                  <p className="text-xs text-muted-foreground">{pct.toFixed(0)}% hoàn thành</p>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
