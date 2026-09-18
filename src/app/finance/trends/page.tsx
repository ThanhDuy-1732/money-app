import { getFinanceTrend } from '@/features/finance/actions/trend.actions'
import { TrendChart } from '@/features/finance/components/TrendChart'
import Link from 'next/link'

export default async function TrendsPage() {
  const result = await getFinanceTrend(6)

  if ('error' in result && result.error === 'premium_required') {
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-bold mb-2">Phân tích xu hướng</h1>
        <p className="text-zinc-500 mb-4">Tính năng này chỉ dành cho thành viên Premium.</p>
        <div className="flex justify-center gap-2 mb-4">
          <Link href="/billing/upgrade" className="rounded-lg border px-3 py-1.5 text-sm font-medium">↓ Xuất CSV</Link>
          <Link href="/billing/upgrade" className="rounded-lg border px-3 py-1.5 text-sm font-medium">↓ Xuất PDF</Link>
        </div>
        <Link href="/billing/upgrade" className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white">
          Nâng cấp Premium
        </Link>
      </div>
    )
  }

  if ('error' in result) {
    return <p className="p-6 text-red-500">Lỗi: {result.error}</p>
  }

  const netTotal = result.reduce((s, r) => s + r.net, 0)

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Xu hướng tài chính (6 tháng)</h1>
      <TrendChart data={result} />
      <div className="rounded-lg border p-4">
        <p className="text-sm text-zinc-500">Tiết kiệm ròng (6 tháng)</p>
        <p className={`text-2xl font-bold ${netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(netTotal)}
        </p>
      </div>
      {/* Export — Premium only, same gate already passed above */}
      <div className="flex gap-2">
        <a
          href={`/finance/export?format=csv&month=${new Date().toISOString().slice(0, 7)}`}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
        >
          ↓ Xuất CSV
        </a>
        <a
          href={`/finance/export?format=pdf&month=${new Date().toISOString().slice(0, 7)}`}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
        >
          ↓ Xuất PDF
        </a>
      </div>
    </div>
  )
}
