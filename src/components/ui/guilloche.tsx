import { cn } from '@/lib/cn'

export function Guilloche({
  opacity = 0.06,
  className,
}: {
  opacity?: number
  className?: string
}) {
  return (
    <svg
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
      style={{ opacity }}
    >
      <defs>
        <pattern id="guilloche" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="0" cy="0" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="24" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#guilloche)" />
    </svg>
  )
}
