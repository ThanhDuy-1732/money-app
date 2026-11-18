import { redirect } from 'next/navigation'
import { TriangleAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listBudgets, getBudgetProgress } from '@/features/finance/budget.actions'
import { currentMonthIso } from '@/lib/date'
import {
  Amount,
  Badge,
  Card,
  CardBody,
  CategoryIcon,
  EmptyState,
  PageHeader,
  Progress,
} from '@/components/ui'

type BudgetWithProgress = {
  id: string
  limit_amount: number
  categories: { name: string; icon: string | null } | null
  spent: number
  pct: number
}

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const month = currentMonthIso()
  const budgets = await listBudgets(month)
  const withProgress = await Promise.all(
    budgets.map(async b => {
      const { spent, limit } = await getBudgetProgress(b.category_id, month)
      return { ...b, spent, pct: limit > 0 ? Math.min((spent / limit) * 100, 100) : 0 }
    })
  )

  const rows = withProgress as BudgetWithProgress[]
  const monthLabel = new Date(`${month}-01`).toLocaleDateString('vi-VN', {
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <main className="mx-auto max-w-default space-y-6 px-4 py-6">
      <PageHeader
        title="Ngân sách"
        description={`Tháng ${monthLabel}`}
        backHref="/finance"
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Chưa có ngân sách"
          description="Ngân sách của bạn sẽ xuất hiện ở đây khi được thiết lập."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map(budget => {
            const remaining = Math.max(budget.limit_amount - budget.spent, 0)
            const tone = budget.pct >= 100 ? 'lotus' : budget.pct >= 80 ? 'coin' : 'leaf'

            return (
              <Card key={budget.id} data-testid="budget-card">
                <CardBody className="space-y-3 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CategoryIcon
                        icon={budget.categories?.icon ?? null}
                        className="h-4 w-4 text-primary"
                      />
                      <p className="font-semibold">
                        {budget.categories?.name ?? 'Không phân loại'}
                      </p>
                    </div>
                    <Badge variant={tone}>{budget.pct.toFixed(0)}%</Badge>
                  </div>

                  <Progress value={budget.pct} tone={tone} />

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Đã chi</span>
                    <Amount value={budget.spent} kind="vnd" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Hạn mức</span>
                    <Amount value={budget.limit_amount} kind="vnd" />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Còn lại</span>
                    <Amount
                      value={remaining}
                      kind="vnd"
                      tone={budget.pct >= 100 ? 'lotus' : 'leaf'}
                    />
                  </div>

                  {budget.pct >= 80 && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                      <TriangleAlert className="h-3.5 w-3.5" />
                      {budget.pct >= 100 ? 'Đã vượt ngân sách' : 'Sắp đạt giới hạn'}
                    </p>
                  )}
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}
