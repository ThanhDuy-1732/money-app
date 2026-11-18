import { cn } from '@/lib/cn'

const formatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

const amountSizes = {
  sm: 'text-xs font-semibold',
  md: 'text-sm font-semibold',
  lg: 'text-h3 font-bold',
  xl: 'text-h1 font-extrabold',
  stat: 'text-h2 font-bold',
} as const

const amountTones = {
  default: 'text-foreground',
  leaf: 'text-leaf',
  lotus: 'text-lotus',
  coin: 'text-coin-deep',
} as const

export function Amount({
  value,
  kind,
  sign = 'auto',
  size = 'md',
  tone = 'default',
  className,
}: {
  value: number
  kind: 'vnd' | 'points'
  sign?: 'auto' | 'plus' | 'minus' | 'none'
  size?: keyof typeof amountSizes
  tone?: keyof typeof amountTones
  className?: string
}) {
  const absolute = Math.abs(value)
  const prefix =
    sign === 'plus' ? '+' : sign === 'minus' ? '−' : sign === 'auto' && value < 0 ? '−' : ''
  const suffix = kind === 'points' ? 'điểm' : 'đ'

  return (
    <span className={cn('tabular whitespace-nowrap', amountSizes[size], amountTones[tone], className)}>
      {prefix}
      {formatter.format(absolute)}
      <span className="ml-1 text-[0.72em] font-semibold text-muted-foreground">{suffix}</span>
    </span>
  )
}
