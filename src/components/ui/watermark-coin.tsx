import { cn } from '@/lib/cn'

export function WatermarkCoin({
  size = 120,
  opacity = 0.06,
  className,
}: {
  size?: number
  opacity?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none absolute select-none font-extrabold leading-none text-ink', className)}
      style={{ fontSize: size, opacity }}
    >
      đ
    </span>
  )
}
