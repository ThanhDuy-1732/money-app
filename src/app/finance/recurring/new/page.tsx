'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useTransition, useState } from 'react'
import { createRecurring } from '@/features/finance/recurring.actions'
import { createClient } from '@/lib/supabase/client'

export default function NewRecurringPage() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([])

  useEffect(() => {
    const supabase = createClient()
    void supabase.from('categories').select('id, name, type').order('name').then(({ data }) => {
      setCategories(data ?? [])
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const raw = {
      type: fd.get('type') as string,
      amount_vnd: Number(fd.get('amount_vnd')),
      category_id: (fd.get('category_id') as string) || undefined,
      start_date: fd.get('start_date') as string,
      note: (fd.get('note') as string) || undefined,
    }
    startTransition(async () => {
      const result = await createRecurring(raw)
      if (result.error) {
        setError(result.error)
      } else {
        router.push('/finance/recurring')
      }
    })
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Thêm giao dịch định kỳ</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Loại</label>
          <select name="type" required value={type} onChange={e => setType(e.target.value as 'income' | 'expense')} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="expense">Chi tiêu</option>
            <option value="income">Thu nhập</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Danh mục (tuỳ chọn)</label>
          <select name="category_id" className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Không chọn</option>
            {categories.filter(category => category.type === type).map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Số tiền (VND)</label>
          <input name="amount_vnd" type="number" required min={1} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="100000" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ngày bắt đầu</label>
          <input name="start_date" type="date" required className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ghi chú (tuỳ chọn)</label>
          <input name="note" type="text" maxLength={200} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Tiền thuê nhà, điện nước..." />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={pending} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
          {pending ? 'Đang lưu...' : 'Lưu'}
        </button>
      </form>
    </div>
  )
}
