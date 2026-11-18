import * as React from 'react'
import { cn } from '@/lib/cn'

const skeletonVariants = {
  text: 'h-4 w-full rounded-sm',
  card: 'h-32 w-full rounded-lg',
  row: 'h-12 w-full rounded-md',
} as const

export function Skeleton({
  variant = 'text',
  className,
}: {
  variant?: keyof typeof skeletonVariants
  className?: string
}) {
  return <div aria-hidden className={cn('animate-pulse bg-muted', skeletonVariants[variant], className)} />
}
