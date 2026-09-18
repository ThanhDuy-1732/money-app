/* eslint-disable @typescript-eslint/no-explicit-any -- existing untyped query results; regenerate Supabase types */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createTransaction } from '@/features/finance/transaction.actions'

export default async function NewTransactionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon, type')
    .or('user_id.is.null,user_id.eq.' + user.id)
    .order('name')

  async function submit(form: FormData) {
    'use server'
    const result = await createTransaction({
      type: form.get('type'),
      amount_vnd: Number(form.get('amount_vnd')),
      category_id: form.get('category_id') || undefined,
      note: form.get('note') || undefined,
      occurred_at: form.get('occurred_at') || undefined,
    })
    if (!result.error) redirect('/finance')
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-4">Thêm giao dịch</h1>
      <form action={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Loại</label>
          <select name="type" className="w-full border rounded-lg p-2" required>
            <option value="expense">Chi tiêu</option>
            <option value="income">Thu nhập</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Số tiền (VNĐ)</label>
          <input name="amount_vnd" type="number" min="1" step="1000" required
            className="w-full border rounded-lg p-2" placeholder="50000" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Danh mục</label>
          <select name="category_id" className="w-full border rounded-lg p-2">
            <option value="">Không phân loại</option>
            {(categories ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ngày</label>
          <input name="occurred_at" type="date" className="w-full border rounded-lg p-2"
            defaultValue={new Date().toISOString().slice(0, 10)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ghi chú</label>
          <input name="note" type="text" maxLength={200} className="w-full border rounded-lg p-2"
            placeholder="Tùy chọn" />
        </div>
        <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-xl font-semibold">
          Lưu giao dịch
        </button>
      </form>
    </main>
  )
}
