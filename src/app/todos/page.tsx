import { redirect } from 'next/navigation'
import { CheckCircle2, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardBody, EmptyState, PageHeader } from '@/components/ui'

export default async function TodosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .eq('user_id', user.id)
    .order('done')
    .order('due_date', { ascending: true, nullsFirst: false })

  const active = (todos ?? []).filter(todo => !todo.done)
  const done = (todos ?? []).filter(todo => todo.done)

  return (
    <main data-testid="todos-page" className="mx-auto max-w-default space-y-6 px-4 py-6">
      <PageHeader
        title="Việc cần làm"
        description={`${active.length} việc đang chờ.`}
      />

      {active.length === 0 ? (
        <EmptyState
          title="Không có việc nào đang chờ"
          description="Việc cần làm của bạn sẽ xuất hiện ở đây."
        />
      ) : (
        <div className="space-y-2">
          {active.map(todo => (
            <Card key={todo.id}>
              <CardBody className="flex items-center gap-3 py-3">
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{todo.title}</p>
                  {todo.due_date && (
                    <p className="text-xs text-muted-foreground">
                      Hạn: {new Date(todo.due_date).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
            Đã hoàn thành ({done.length})
          </summary>
          <div className="mt-2 space-y-2">
            {done.map(todo => (
              <Card key={todo.id} className="opacity-60">
                <CardBody className="flex items-center gap-3 py-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm line-through">{todo.title}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </details>
      )}
    </main>
  )
}
