import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RedeemCard } from '@/features/wallet/components/RedeemCard'
import { BalanceCard } from '@/features/wallet/components/BalanceCard'
import { markAllRead } from '@/features/notifications/mark-all'
import { currentMonthIso, todayIso } from '@/lib/date'

const read = (path: string) => readFileSync(path, 'utf8')

describe('review fixes', () => {
  it('profile page passes the author and viewer ids separately', () => {
    const page = read('src/app/u/[username]/page.tsx')
    expect(page).toContain('authorId={profile.id}')
    expect(page).toContain('userId={user?.id}')
  })

  it('shop detail uses the purchase dialog', () => {
    expect(read('src/app/shop/[id]/page.tsx')).toContain('PurchaseDialog')
  })

  it('redeem card marks sold-out rewards unavailable', () => {
    const html = renderToStaticMarkup(
      <RedeemCard
        userBalance={500}
        reward={{
          id: '1',
          name: 'Huy hiệu',
          description: null,
          points_cost: 200,
          stock: 0,
          active: true,
          created_at: '',
        }}
      />
    )
    expect(html).toContain('Hết lượt')
  })

  it('admin pages use confirmation actions', () => {
    expect(read('src/app/admin/users/page.tsx')).toContain('ConfirmAction')
    expect(read('src/app/admin/posts/page.tsx')).toContain('ConfirmAction')
  })

  it('admin shop forms live in a dialog', () => {
    expect(read('src/app/admin/shop/page.tsx')).toContain('FormDialog')
  })

  it('explore has a users empty state', () => {
    expect(read('src/features/explore/components/hybrid-search.tsx')).toContain(
      'Không tìm thấy người dùng'
    )
  })

  it('leaderboard has an empty state', () => {
    expect(read('src/features/referral/components/ReferralLeaderboard.tsx')).toContain('EmptyState')
  })

  it('markAllRead marks unread items', () => {
    const items = [{ read_at: null }, { read_at: '2026-01-01' }]
    const next = markAllRead(items)
    expect(next[0].read_at).toBeTruthy()
    expect(next[1].read_at).toBe('2026-01-01')
  })

  it('balance card uses the real user serial', () => {
    const html = renderToStaticMarkup(
      <BalanceCard
        balance={1250}
        streak={7}
        userId="12345678-aaaa-bbbb-cccc-ddddeeeeffff"
      />
    )
    expect(html).toContain('1234 5678')
  })

  it('finance uses large amounts, a responsive summary and wrapped category names', () => {
    const page = read('src/app/finance/page.tsx')
    expect(page).toContain('size="stat"')
    expect(page).toContain('grid-cols-1')
    expect(page).toContain('sm:grid-cols-2')
    expect(page).toContain('line-clamp-2')
  })

  it('brand surfaces stay dark in both themes', () => {
    expect(read('src/app/page.tsx')).toContain('bg-inverse')
    expect(read('src/app/(auth)/login/page.tsx')).toContain('bg-inverse')
    expect(read('src/app/(auth)/register/page.tsx')).toContain('bg-inverse')
    expect(read('src/components/AppNav.tsx')).toContain('bg-inverse')
  })

  it('overlays use the fixed dark token', () => {
    expect(read('src/components/ui/dialog.tsx')).toContain('bg-overlay')
    expect(read('src/components/ui/sheet.tsx')).toContain('bg-overlay')
  })

  it('note labels use full-opacity text', () => {
    expect(read('src/components/ui/note.tsx')).not.toContain('text-primary/')
    expect(read('src/app/page.tsx')).not.toContain('text-primary/')
  })

  it('composer keeps the focus ring', () => {
    expect(read('src/features/feed/components/PostComposer.tsx')).not.toContain(
      'focus-visible:ring-0'
    )
  })

  it('local date helpers use local components', () => {
    const date = new Date(2026, 10, 18, 1, 30)
    expect(todayIso(date)).toBe('2026-11-18')
    expect(currentMonthIso(date)).toBe('2026-11')
  })
})
