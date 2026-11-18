import { redirect } from 'next/navigation'
import { Pin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge, Card, CardBody, EmptyState, PageHeader } from '@/components/ui'

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user.id)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })

  const rows = notes ?? []

  return (
    <main data-testid="notes-page" className="mx-auto max-w-default space-y-6 px-4 py-6">
      <PageHeader title="Ghi chú" description="Những ghi chú bạn đã lưu." />

      {rows.length === 0 ? (
        <EmptyState
          title="Chưa có ghi chú"
          description="Ghi chú của bạn sẽ xuất hiện ở đây."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map(note => (
            <Card key={note.id}>
              <CardBody className="space-y-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{note.title ?? '(Không có tiêu đề)'}</p>
                  {note.pinned && (
                    <Badge variant="coin">
                      <Pin className="h-3 w-3" />
                      Ghim
                    </Badge>
                  )}
                </div>
                {note.content && (
                  <p className="line-clamp-3 text-sm text-muted-foreground">{note.content}</p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {new Date(note.updated_at).toLocaleDateString('vi-VN')}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
