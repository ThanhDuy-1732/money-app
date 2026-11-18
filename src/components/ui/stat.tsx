import * as React from 'react'
import { cn } from '@/lib/cn'

export function Stat({
  label,
  value,
  delta,
  tone = 'default',
  icon,
  className,
}: {
  label: string
  value: React.ReactNode
  delta?: React.ReactNode
  tone?: 'default' | 'leaf' | 'lotus' | 'coin'
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          'mt-2 text-h2 font-bold tracking-tight tabular',
          tone === 'leaf' && 'text-leaf',
          tone === 'lotus' && 'text-lotus',
          tone === 'coin' && 'text-coin-deep'
        )}
      >
        {value}
      </p>
      {delta && <p className="mt-1 text-xs text-muted-foreground">{delta}</p>}
    </div>
  )
}
