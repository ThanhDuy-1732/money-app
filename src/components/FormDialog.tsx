'use client'
import type * as React from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui'

export function FormDialog({
  trigger,
  title,
  description,
  children,
}: {
  trigger: string
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button">{trigger}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogTitle className="text-h3 font-semibold">{title}</DialogTitle>
        {description && (
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            {description}
          </DialogDescription>
        )}
        <div className="mt-4">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
