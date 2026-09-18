/* eslint-disable @typescript-eslint/no-explicit-any -- existing untyped query results; regenerate Supabase types */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function TodosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: todos } = await supabase
    .from('todos').select('*').eq('user_id', user.id)
    .order('done').order('due_date', { ascending: true, nullsFirst: false })

  const active = (todos ?? []).filter((t: any) => !t.done)
  const done = (todos ?? []).filter((t: any) => t.done)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">To-do ({active.length} việc cần làm)</h1>
      {active.length === 0 && <p className="text-gray-400">Không có việc nào đang chờ.</p>}
      {active.map((t: any) => (
        <div key={t.id} className="flex items-center gap-3 border rounded-lg p-3">
          <span className="text-lg">⬜</span>
          <div>
            <p>{t.title}</p>
            {t.due_date && <p className="text-xs text-gray-400">Hạn: {t.due_date}</p>}
          </div>
        </div>
      ))}
      {done.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-gray-400 pt-2">Đã hoàn thành ({done.length})</h2>
          {done.map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 border rounded-lg p-3 opacity-50">
              <span className="text-lg">✅</span>
              <p className="line-through">{t.title}</p>
            </div>
          ))}
        </>
      )}
    </main>
  )
}
