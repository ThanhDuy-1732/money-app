'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const TABS = [
  { href: '/admin', label: 'Tổng quan' },
  { href: '/admin/users', label: 'Người dùng' },
  { href: '/admin/posts', label: 'Bài đăng' },
  { href: '/admin/shop', label: 'Cửa hàng' },
]

export function AdminTabs() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map(tab => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative shrink-0 px-3 py-2 text-sm font-semibold transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </Link>
        )
      })}
    </nav>
  )
}
