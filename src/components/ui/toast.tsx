'use client'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import React from 'react'
import { cn } from '@/lib/cn'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      <ToastPrimitive.Viewport className="fixed inset-x-4 top-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:w-80" />
    </ToastPrimitive.Provider>
  )
}

const toastVariants = {
  default: {
    root: 'border-border bg-card',
    icon: 'bg-muted text-foreground',
    Icon: Info,
  },
  success: {
    root: 'border-primary/30 bg-secondary',
    icon: 'bg-primary text-primary-foreground',
    Icon: CheckCircle2,
  },
  destructive: {
    root: 'border-destructive/30 bg-destructive/10',
    icon: 'bg-destructive text-destructive-foreground',
    Icon: AlertCircle,
  },
} as const

export function Toast({
  open,
  onOpenChange,
  title,
  description,
  variant = 'default',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  variant?: keyof typeof toastVariants
}) {
  const tone = toastVariants[variant]
  const Icon = tone.Icon

  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        'toast-root pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-sheet',
        tone.root
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          tone.icon
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <ToastPrimitive.Title className="text-sm font-semibold">{title}</ToastPrimitive.Title>
        {description && (
          <ToastPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
            {description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        aria-label="Đóng thông báo"
        className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  )
}
