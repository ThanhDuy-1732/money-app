'use client'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn } from '@/lib/cn'

const avatarSizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-lg',
} as const

export function Avatar({
  src,
  fallback,
  className,
  size = 'md',
  ring = false,
}: {
  src?: string | null
  fallback: string
  className?: string
  size?: keyof typeof avatarSizes
  ring?: boolean
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        avatarSizes[size],
        ring && 'ring-2 ring-card',
        className
      )}
    >
      {src && <AvatarPrimitive.Image src={src} alt={fallback} className="aspect-square h-full w-full object-cover" />}
      <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground">
        {fallback.slice(0, 2).toUpperCase()}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}
