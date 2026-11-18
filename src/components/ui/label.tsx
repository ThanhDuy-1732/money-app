import * as React from 'react'
import { cn } from '@/lib/cn'

interface LabelProps {
  htmlFor?: string
  children: React.ReactNode
  required?: boolean
  className?: string
}

export function Label({ htmlFor, children, required = false, className }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={cn('text-sm font-medium text-foreground', className)}>
      {children}
      {required && (
        <span className="ml-0.5 text-destructive" aria-hidden>
          *
        </span>
      )}
    </label>
  )
}
