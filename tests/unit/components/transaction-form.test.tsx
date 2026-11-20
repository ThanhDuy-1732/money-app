import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { TransactionForm } from '@/features/finance/components/TransactionForm'

describe('transaction form', () => {
  it('accepts round thousand amounts', () => {
    const html = renderToStaticMarkup(
      <TransactionForm categories={[]} action={vi.fn()} />
    )

    expect(html).toContain('min="1000"')
    expect(html).toContain('step="1000"')
  })
})
