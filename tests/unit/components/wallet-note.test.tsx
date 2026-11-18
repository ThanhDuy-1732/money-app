import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BalanceCard } from '@/features/wallet/components/BalanceCard'

describe('BalanceCard', () => {
  it('shows the polymer note serial, points, streak and the balance test id', () => {
    const html = renderToStaticMarkup(<BalanceCard balance={1250} streak={7} />)
    expect(html).toContain('1.250')
    expect(html).toContain('điểm')
    expect(html).toContain('data-testid="balance"')
    expect(html).toContain('data-testid="wallet-note"')
    expect(html).toContain('SỐ VÍ')
    expect(html).toContain('7 ngày')
  })
})
