import * as React from 'react'
import { cn } from '@/lib/cn'

const progressTones = {
  leaf: 'bg-leaf',
  coin: 'bg-coin',
  lotus: 'bg-destructive',
} as const

export function Progress({
  value,
  max = 100,
  tone = 'leaf',
  className,
}: {
  value: number
  max?: number
  tone?: keyof typeof progressTones
  className?: string
}) {
  const clamped = Math.min(Math.max(value, 0), max)
  const percent = max > 0 ? (clamped / max) * 100 : 0

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width]', progressTones[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
