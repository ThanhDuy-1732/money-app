'use client'
import { useCallback, useEffect, useState } from 'react'

export type ToastMessage = {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'destructive'
}

/**
 * Điều khiển một toast duy nhất: mở khi gọi show(), tự đóng sau duration.
 * Dùng cặp với <Toast open={open} onOpenChange={setOpen} {...message} />.
 */
export function useToast(duration = 3400) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<ToastMessage | null>(null)
  const [nonce, setNonce] = useState(0)

  const show = useCallback((next: ToastMessage) => {
    setMessage(next)
    setNonce(value => value + 1)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => setOpen(false), duration)
    return () => clearTimeout(timer)
  }, [open, nonce, duration])

  return { open, setOpen, message, show }
}
