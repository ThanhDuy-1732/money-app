import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-secondary text-secondary-foreground',
        neutral: 'bg-muted text-muted-foreground',
        leaf: 'bg-secondary text-secondary-foreground',
        lotus: 'bg-destructive/10 text-destructive',
        coin: 'bg-coin/20 text-coin-deep',
        premium: 'bg-coin text-accent-foreground',
        outline: 'border border-border text-foreground',
        success: 'bg-secondary text-secondary-foreground',
        warning: 'bg-coin/20 text-coin-deep',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export function Badge({
  className,
  variant,
  dot = false,
  children,
}: VariantProps<typeof badgeVariants> & {
  className?: string
  dot?: boolean
  children: React.ReactNode
}) {
  return (
    <span className={cn(badgeVariants({ variant, className }))}>
      {dot && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
