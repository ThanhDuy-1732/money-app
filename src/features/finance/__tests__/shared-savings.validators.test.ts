import { describe, it, expect } from 'vitest'
import { goalContributionSchema } from '@/lib/validators/finance'

describe('goalContributionSchema', () => {
  it('rejects zero amount', () => {
    const r = goalContributionSchema.safeParse({ amount: 0 })
    expect(r.success).toBe(false)
  })
  it('rejects negative amount', () => {
    const r = goalContributionSchema.safeParse({ amount: -100 })
    expect(r.success).toBe(false)
  })
  it('accepts valid amount', () => {
    const r = goalContributionSchema.safeParse({ amount: 500000 })
    expect(r.success).toBe(true)
  })
})
