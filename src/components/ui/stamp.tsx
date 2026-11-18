import { cn } from '@/lib/cn'

const stampTones = {
  leaf: 'border-primary text-primary',
  lotus: 'border-destructive text-destructive',
  coin: 'border-coin-deep text-coin-deep',
} as const

export function Stamp({
  status,
  tone = 'leaf',
  rotate = true,
  className,
}: {
  status: string
  tone?: keyof typeof stampTones
  rotate?: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border-2 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em]',
        stampTones[tone],
        rotate && '-rotate-6',
        className
      )}
    >
      {status}
    </span>
  )
}
