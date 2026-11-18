'use client'
import * as ToastPrimitive from '@radix-ui/react-toast'
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
  variant?: 'default' | 'destructive' | 'success'
}) {
  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        'rounded-lg border p-4 shadow-sheet',
        variant === 'destructive' && 'border-destructive/30 bg-destructive/10',
        variant === 'success' && 'border-primary/30 bg-secondary',
        variant === 'default' && 'border-border bg-card'
      )}
    >
      <ToastPrimitive.Title className="text-sm font-semibold">{title}</ToastPrimitive.Title>
      {description && (
        <ToastPrimitive.Description className="mt-1 text-sm text-muted-foreground">
          {description}
        </ToastPrimitive.Description>
      )}
    </ToastPrimitive.Root>
  )
}
