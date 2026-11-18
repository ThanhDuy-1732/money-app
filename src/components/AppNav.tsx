'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Bell,
  Coins,
  Compass,
  Ellipsis,
  Gift,
  ListChecks,
  LogOut,
  Newspaper,
  NotebookPen,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Coin } from '@/components/ui/coin'
import { Sheet } from '@/components/ui/sheet'
import { NotificationBadge } from '@/features/notifications/components/NotificationBadge'

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number }

const MAIN: NavItem[] = [
  { href: '/feed', label: 'Bảng tin', icon: Newspaper },
  { href: '/finance', label: 'Tài chính', icon: WalletCards },
  { href: '/wallet', label: 'Ví điểm', icon: Coins },
  { href: '/explore', label: 'Khám phá', icon: Compass },
  { href: '/profile', label: 'Hồ sơ', icon: UserRound },
]

export function AppNav({
  balance,
  streak,
  isAdmin,
  signOutAction,
  unreadCount = 0,
  userId,
}: {
  balance: number
  streak: number
  isAdmin: boolean
  signOutAction: () => void | Promise<void>
  unreadCount?: number
  userId?: string
}) {
  const path = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const active = (href: string) => path === href || path.startsWith(href + '/')

  const more: NavItem[] = [
    { href: '/notifications', label: 'Thông báo', icon: Bell, badge: unreadCount },
    { href: '/notes', label: 'Ghi chú', icon: NotebookPen },
    { href: '/todos', label: 'Việc cần làm', icon: ListChecks },
    { href: '/shop', label: 'Cửa hàng', icon: Store },
    { href: '/invite', label: 'Mời bạn', icon: Gift },
    { href: '/billing/upgrade', label: 'Premium', icon: Sparkles },
    ...(isAdmin ? [{ href: '/admin', label: 'Quản trị', icon: ShieldCheck }] : []),
  ]

  const link = (item: NavItem, onClick?: () => void) => {
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClick}
        aria-current={active(item.href) ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors',
          active(item.href)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {typeof item.badge === 'number' && item.badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card px-3 py-5 md:flex">
        <Link href="/feed" className="px-3 text-xl font-extrabold tracking-tight text-primary">
          MoneyApp
        </Link>
        <p className="mb-4 mt-0.5 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Ví cá nhân
        </p>

        <Link
          href="/wallet"
          className="mb-5 flex items-center gap-3 rounded-xl border border-inverse-foreground/15 bg-inverse px-3 py-3 text-inverse-foreground"
        >
          <Coin size={36} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-base font-bold tabular">
              {balance.toLocaleString('vi-VN')} điểm
            </span>
            <span className="block text-xs text-inverse-foreground/70">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-destructive" />
              {streak} ngày liên tiếp
            </span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {MAIN.map(item => link(item))}
          <div className="my-2 border-t border-border" />
          {more.map(item => link(item))}
        </nav>

        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            Đăng xuất
          </button>
        </form>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <Link href="/feed" className="text-lg font-extrabold tracking-tight text-primary">
          MoneyApp
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/explore"
            aria-label="Tìm kiếm"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </Link>
          {userId ? (
            <NotificationBadge userId={userId} initialCount={unreadCount} />
          ) : (
            <Link
              href="/notifications"
              aria-label={`${unreadCount} thông báo chưa đọc`}
              data-testid="unread-count"
              className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          <Link
            href="/profile"
            aria-label="Hồ sơ"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <UserRound className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        {MAIN.slice(0, 4).map(item => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold',
                active(item.href) ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={cn(
            'flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold',
            moreOpen ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Ellipsis className="h-5 w-5" />
          Thêm
        </button>
      </nav>

      <Sheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        title="Thêm"
        description="Các mục khác trong ứng dụng."
      >
        <div className="flex flex-col gap-1">
          {link(MAIN[4], () => setMoreOpen(false))}
          {more.map(item => link(item, () => setMoreOpen(false)))}
          <div className="my-2 border-t border-border" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
              Đăng xuất
            </button>
          </form>
        </div>
      </Sheet>
    </>
  )
}
