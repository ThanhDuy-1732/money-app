'use client'
import { useEffect, useState } from 'react'
import { Toast } from './toast'

export type ToastOptions = {
  title: string
  description?: string
  variant?: 'default' | 'success' | 'destructive'
}

type ToastItem = ToastOptions & { id: number }

let items: ToastItem[] = []
let nextId = 0
const listeners = new Set<(items: ToastItem[]) => void>()

function publish() {
  for (const listener of listeners) listener(items)
}

export function dismissToast(id: number) {
  items = items.filter(item => item.id !== id)
  publish()
}

/**
 * Gọi được từ bất kỳ client component nào, kể cả sau khi server action refresh
 * trang: <Toaster /> nằm ở root layout nên không bị unmount theo nội dung trang.
 */
export function toast(options: ToastOptions, duration = 3600) {
  const id = ++nextId
  items = [...items, { ...options, id }]
  publish()
  setTimeout(() => dismissToast(id), duration)
  return id
}

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items)

  useEffect(() => {
    const listener = (next: ToastItem[]) => setList(next)
    listeners.add(listener)
    listener(items)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return (
    <>
      {list.map(item => (
        <Toast
          key={item.id}
          open
          onOpenChange={open => {
            if (!open) dismissToast(item.id)
          }}
          title={item.title}
          description={item.description}
          variant={item.variant}
        />
      ))}
    </>
  )
}
