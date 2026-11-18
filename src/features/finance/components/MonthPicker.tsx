'use client'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui'

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
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Tháng trước"
        onClick={() => router.push(`/finance?month=${prevMonth(month)}`)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[7rem] text-center text-sm font-semibold">
        Tháng {m}/{y}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Tháng sau"
        disabled={isCurrentMonth}
        onClick={() => router.push(`/finance?month=${nextMonth(month)}`)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
