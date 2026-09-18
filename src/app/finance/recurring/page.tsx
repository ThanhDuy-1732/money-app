import { listRecurring } from '@/features/finance/recurring.actions'
import { RecurringList } from '@/features/finance/components/RecurringList'
import Link from 'next/link'

export default async function RecurringPage() {
  const items = await listRecurring()
  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Giao dịch định kỳ</h1>
        <Link
          href="/finance/recurring/new"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          + Thêm mới
        </Link>
      </div>
      <RecurringList items={items} />
    </div>
  )
}
