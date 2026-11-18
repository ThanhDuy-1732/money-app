import { cn } from '@/lib/cn'

export function SecurityThread({
  orientation = 'vertical',
  className,
}: {
  orientation?: 'vertical' | 'horizontal'
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('pointer-events-none block', orientation === 'vertical' ? 'h-full w-1' : 'h-1 w-full', className)}
      style={{
        background: `linear-gradient(${orientation === 'vertical' ? '180deg' : '90deg'}, var(--color-security-1), var(--color-security-2), var(--color-security-3))`,
      }}
    />
  )
}
