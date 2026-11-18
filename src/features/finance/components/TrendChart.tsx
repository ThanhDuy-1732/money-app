import dayjs from 'dayjs'
import { EmptyState } from '@/components/ui'
import type { TrendRow } from '@/features/finance/actions/trend.actions'

export function TrendChart({
  data,
}: {
  data: Pick<TrendRow, 'month' | 'total_income' | 'total_expense'>[]
}) {
  if (data.length === 0) {
    return (
      <EmptyState
        title="Chưa có dữ liệu"
        description="Thêm giao dịch để xem xu hướng 6 tháng."
      />
    )
  }

  const maxVal = Math.max(...data.flatMap(row => [row.total_income, row.total_expense]), 1)
  const barW = 18
  const gap = 10
  const groupW = barW * 2 + gap + 16
  const chartH = 120
  const totalW = Math.max(data.length * groupW, 320)

  return (
    <div data-testid="trend-chart">
      <svg
        viewBox={`0 0 ${totalW} ${chartH + 32}`}
        className="h-auto w-full"
        role="img"
        aria-label="Xu hướng thu chi 6 tháng"
      >
        {data.map((row, index) => {
          const x = index * groupW + 8
          const incomeH = (row.total_income / maxVal) * chartH
          const expenseH = (row.total_expense / maxVal) * chartH
          return (
            <g key={row.month}>
              <rect
                x={x}
                y={chartH - incomeH}
                width={barW}
                height={incomeH}
                rx={3}
                style={{ fill: 'var(--color-leaf)' }}
              />
              <rect
                x={x + barW + 4}
                y={chartH - expenseH}
                width={barW}
                height={expenseH}
                rx={3}
                style={{ fill: 'var(--color-lotus)' }}
              />
              <text
                x={x + barW}
                y={chartH + 18}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                className="text-muted-foreground"
              >
                {dayjs(row.month).format('MM/YY')}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-leaf" />
          Thu nhập
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-lotus" />
          Chi tiêu
        </span>
      </div>
    </div>
  )
}
