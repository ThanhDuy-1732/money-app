import * as React from 'react'
import { cn } from '@/lib/cn'

const cardTones = {
  default: 'bg-card',
  paper: 'bg-card',
  coin: 'border-coin/30 bg-coin/10',
  lotus: 'border-destructive/20 bg-destructive/5',
} as const

export function Card({
  tone = 'default',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: keyof typeof cardTones }) {
  return (
    <div
      className={cn('rounded-lg border border-border text-card-foreground', cardTones[tone], className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-h3 font-semibold tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2 p-4 pt-0', className)} {...props} />
}
