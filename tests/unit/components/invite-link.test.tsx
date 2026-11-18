import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InviteLink } from '@/features/referral/components/InviteLink'

describe('InviteLink', () => {
  it('keeps the referral code test id and labels the copy action', () => {
    const html = renderToStaticMarkup(<InviteLink code="abc12345" />)
    expect(html).toContain('data-testid="referral-code"')
    expect(html).toContain('abc12345')
    expect(html).toContain('aria-label="Sao chép mã mời"')
  })
})
