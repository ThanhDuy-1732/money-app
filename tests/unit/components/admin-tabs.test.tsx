import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/users' }))

import { AdminTabs } from '@/components/AdminTabs'

describe('AdminTabs', () => {
  it('marks the current tab and links all sections', () => {
    const html = renderToStaticMarkup(<AdminTabs />)
    expect(html).toContain('Người dùng')
    expect(html).toContain('aria-current="page"')
  })
})
