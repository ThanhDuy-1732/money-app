'use client'
import type * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Sheet({
  open,
  onOpenChange,
  side = 'bottom',
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  side?: 'bottom' | 'right'
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 border border-border bg-card p-5 text-card-foreground shadow-sheet focus:outline-none',
            side === 'bottom'
              ? 'inset-x-0 bottom-0 rounded-t-2xl md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-[420px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl'
              : 'inset-y-0 right-0 w-[360px] max-w-[92vw] rounded-l-2xl'
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <DialogPrimitive.Title className="text-h3 font-semibold">{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description className={cn('mt-1 text-sm text-muted-foreground', !description && 'sr-only')}>
                {description ?? title}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Đóng"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
