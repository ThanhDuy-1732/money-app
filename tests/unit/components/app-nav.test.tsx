import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/wallet' }))

import { AppNav } from '@/components/AppNav'

describe('AppNav', () => {
  it('renders the main links, active wallet and unread count', () => {
    const html = renderToStaticMarkup(
      <AppNav balance={1250} streak={7} isAdmin={false} signOutAction={() => {}} unreadCount={3} />
    )
    expect(html).toContain('Bảng tin')
    expect(html).toContain('Ví điểm')
    expect(html).toContain('data-testid="unread-count"')
    expect(html).toContain('aria-label="3 thông báo chưa đọc"')
    expect(html).toContain('aria-current="page"')
  })
})
