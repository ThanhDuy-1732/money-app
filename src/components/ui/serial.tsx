'use client'
import { Copy } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Serial({
  value,
  label,
  copyable = false,
  className,
}: {
  value: string
  label?: string
  copyable?: boolean
  className?: string
}) {
  const raw = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
  const grouped = raw.length > 4 ? `${raw.slice(0, 4)} ${raw.slice(4)}` : raw

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground',
        className
      )}
    >
      {label && <span className="font-sans text-[9px] font-bold uppercase tracking-[0.14em]">{label}</span>}
      <span>{grouped}</span>
      {copyable && (
        <button
          type="button"
          aria-label="Sao chép"
          onClick={() => navigator.clipboard?.writeText(grouped)}
          className="rounded p-0.5 hover:bg-muted"
        >
          <Copy className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
