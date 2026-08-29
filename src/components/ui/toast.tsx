'use client'
import * as ToastPrimitive from '@radix-ui/react-toast'
import React from 'react'
import { cn } from '@/lib/cn'

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80" />
    </ToastPrimitive.Provider>
  )
}

export function Toast({
  open, onOpenChange, title, description, variant = 'default',
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}) {
  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        'rounded-md p-4 shadow-lg border',
        variant === 'destructive' ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
      )}
    >
      <ToastPrimitive.Title className="text-sm font-semibold">{title}</ToastPrimitive.Title>
      {description && <ToastPrimitive.Description className="text-sm text-gray-500">{description}</ToastPrimitive.Description>}
    </ToastPrimitive.Root>
  )
}
