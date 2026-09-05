import type { TrendRow } from '@/features/finance/actions/trend.actions'
import dayjs from 'dayjs'

function fmt(n: number) {
  return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function TrendChart({ data }: { data: TrendRow[] }) {
  if (data.length === 0)
    return <p className="text-zinc-500 text-sm">Chưa có giao dịch nào trong 6 tháng qua.</p>

  const maxVal = Math.max(...data.flatMap(r => [r.total_income, r.total_expense]), 1)
  const barW = 24
  const gap = 12
  const chartH = 120
  const totalW = data.length * (barW * 2 + gap + 8)

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={chartH + 40} className="block">
        {data.map((row, i) => {
          const x = i * (barW * 2 + gap + 8)
          const incH = (row.total_income / maxVal) * chartH
          const expH = (row.total_expense / maxVal) * chartH
          return (
            <g key={row.month}>
              <rect x={x} y={chartH - incH} width={barW} height={incH} fill="#22c55e" rx={2} />
              <rect x={x + barW + 4} y={chartH - expH} width={barW} height={expH} fill="#ef4444" rx={2} />
              <text x={x + barW} y={chartH + 16} textAnchor="middle" fontSize={10} fill="currentColor">
                {dayjs(row.month).format('MM/YY')}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-zinc-500">
        <span><span className="inline-block w-3 h-3 bg-green-500 rounded-sm mr-1" />Thu nhập</span>
        <span><span className="inline-block w-3 h-3 bg-red-500 rounded-sm mr-1" />Chi tiêu</span>
      </div>
    </div>
  )
}
