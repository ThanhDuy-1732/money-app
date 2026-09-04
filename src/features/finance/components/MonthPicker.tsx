'use client'
import { useRouter } from 'next/navigation'

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (m === 12) return `${y + 1}-01`
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter()
  const [y, m] = month.split('-')
  const isCurrentMonth = month === currentMonth()

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => router.push(`/finance?month=${prevMonth(month)}`)}
        className="px-2 py-1 border rounded hover:bg-gray-50 text-sm"
        aria-label="Tháng trước"
      >
        ←
      </button>
      <span className="font-semibold text-sm min-w-[7rem] text-center">
        Tháng {m}/{y}
      </span>
      <button
        onClick={() => router.push(`/finance?month=${nextMonth(month)}`)}
        disabled={isCurrentMonth}
        className="px-2 py-1 border rounded hover:bg-gray-50 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Tháng sau"
      >
        →
      </button>
    </div>
  )
}
