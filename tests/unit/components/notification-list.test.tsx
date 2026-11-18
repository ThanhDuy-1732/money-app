import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NotificationList } from '@/features/notifications/components/NotificationList'

describe('NotificationList', () => {
  it('renders accessible tabs and an empty state', () => {
    const html = renderToStaticMarkup(<NotificationList initialItems={[]} userId="u1" />)
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Chưa có thông báo')
  })
})
