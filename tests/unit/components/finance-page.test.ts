import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('finance page', () => {
  it('marks the summary and the transaction ledger', () => {
    const page = readFileSync('src/app/finance/page.tsx', 'utf8')
    expect(page).toContain('data-testid="finance-summary"')
    expect(page).toContain('data-testid="transaction-ledger"')
  })
})
