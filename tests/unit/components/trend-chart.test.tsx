import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TrendChart } from '@/features/finance/components/TrendChart'

describe('TrendChart', () => {
  it('uses token colors and renders both series', () => {
    const html = renderToStaticMarkup(
      <TrendChart data={[{ month: '2026-11-01', total_income: 100, total_expense: 50 }]} />
    )
    expect(html).toContain('var(--color-leaf)')
    expect(html).toContain('var(--color-lotus)')
  })
})
