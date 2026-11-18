import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/cn'

export function PageHeader({
  title,
  description,
  meta,
  actions,
  backHref,
  className,
}: {
  title: string
  description?: string
  meta?: React.ReactNode
  actions?: React.ReactNode
  backHref?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-start md:justify-between', className)}>
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại
          </Link>
        )}
        <h1 className="text-h1 font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        {meta && <div className="mt-1 text-xs text-muted-foreground">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
