'use client'
import { toggleRecurring, deleteRecurring } from '@/features/finance/recurring.actions'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { RecurringItem } from '@/features/finance/recurring.actions'

export function RecurringList({ items }: { items: RecurringItem[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (items.length === 0) {
    return <p className="text-center text-gray-400 py-8">Chưa có giao dịch định kỳ nào.</p>
  }

  return (
    <ul className="space-y-2">
      {error && <li role="alert" className="text-sm text-red-600">{error}</li>}
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between border rounded-lg p-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${item.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {item.type === 'income' ? 'Thu' : 'Chi'}
              </span>
              <span className={`font-semibold ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                {item.amount_vnd.toLocaleString('vi-VN')}đ
              </span>
            </div>
            <p className="text-xs text-gray-500">Từ {item.start_date}{item.note ? ` · ${item.note}` : ''}</p>
            <p className={`text-xs ${item.active ? 'text-green-600' : 'text-gray-400'}`}>
              {item.active ? 'Đang hoạt động' : 'Tạm dừng'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={() => startTransition(async () => {
                const result = await toggleRecurring(item.id)
                setError(result.error)
                if (!result.error) router.refresh()
              })}
              className="text-xs px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {item.active ? 'Tạm dừng' : 'Kích hoạt'}
            </button>
            <button
              disabled={pending}
              onClick={() => {
                if (confirm('Xóa giao dịch định kỳ này?')) {
                  startTransition(async () => {
                    const result = await deleteRecurring(item.id)
                    setError(result.error)
                    if (!result.error) router.refresh()
                  })
                }
              }}
              className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
            >
              Xóa
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
