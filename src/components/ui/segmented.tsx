'use client'
import { cn } from '@/lib/cn'

export function Segmented({
  options,
  value,
  onValueChange,
  className,
}: {
  options: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex max-w-full overflow-x-auto rounded-full border border-border bg-muted p-1', className)}>
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
