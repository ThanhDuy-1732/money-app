import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('budgets and goals pages', () => {
  it('marks the read-only cards', () => {
    expect(readFileSync('src/app/finance/budgets/page.tsx', 'utf8')).toContain(
      'data-testid="budget-card"'
    )
    expect(readFileSync('src/app/finance/goals/page.tsx', 'utf8')).toContain(
      'data-testid="goal-card"'
    )
  })
})
