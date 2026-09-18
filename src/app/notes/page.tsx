/* eslint-disable @typescript-eslint/no-explicit-any -- existing untyped query results; regenerate Supabase types */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notes } = await supabase
    .from('notes').select('*').eq('user_id', user.id)
    .order('pinned', { ascending: false }).order('updated_at', { ascending: false })

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-3">
      <h1 className="text-xl font-bold">Ghi chú</h1>
      {(notes ?? []).length === 0 && (
        <p className="text-center text-gray-400 py-8">Chưa có ghi chú nào.</p>
      )}
      {(notes ?? []).map((n: any) => (
        <div key={n.id} className="border rounded-xl p-4">
          <div className="flex justify-between">
            <p className="font-semibold">{n.pinned ? '📌 ' : ''}{n.title ?? '(Không có tiêu đề)'}</p>
          </div>
          {n.content && <p className="text-sm text-gray-600 mt-1 line-clamp-3">{n.content}</p>}
          <p className="text-xs text-gray-400 mt-2">{new Date(n.updated_at).toLocaleDateString('vi-VN')}</p>
        </div>
      ))}
    </main>
  )
}
