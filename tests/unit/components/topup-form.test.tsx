import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TopupForm } from '@/features/wallet/components/TopupForm'

describe('TopupForm', () => {
  it('renders the 50.000 preset, selected state and the VNPay CTA', () => {
    const html = renderToStaticMarkup(<TopupForm />)
    expect(html).toContain('50.000')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('Thanh toán qua VNPay')
  })
})
