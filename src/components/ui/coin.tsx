import { cn } from '@/lib/cn'

export function Coin({
  size = 40,
  flip = false,
  className,
}: {
  size?: number
  flip?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-coin font-extrabold text-accent-foreground',
        flip && 'coin-flip',
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.48 }}
    >
      đ
    </span>
  )
}
