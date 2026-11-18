import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OtpInput } from '@/features/auth/components/OtpInput'

describe('OtpInput', () => {
  it('keeps the E2E placeholder and adds OTP autofill semantics', () => {
    const html = renderToStaticMarkup(<OtpInput value="" onChange={() => {}} />)
    expect(html).toContain('placeholder="000000"')
    expect(html).toContain('inputMode="numeric"')
    expect(html).toContain('maxLength="6"')
    expect(html.toLowerCase()).toContain('autocomplete="one-time-code"')
    expect(html).toContain('aria-label="Mã OTP"')
  })
})
