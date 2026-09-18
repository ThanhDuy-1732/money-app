import { describe, it, expect } from 'vitest'
import { giftPointsSchema } from '@/lib/validators/finance'

describe('giftPointsSchema', () => {
  it('rejects zero amount', () => {
    const r = giftPointsSchema.safeParse({ amount: 0 })
    expect(r.success).toBe(false)
  })
  it('rejects negative amount', () => {
    const r = giftPointsSchema.safeParse({ amount: -10 })
    expect(r.success).toBe(false)
  })
  it('rejects amount above daily limit', () => {
    const r = giftPointsSchema.safeParse({ amount: 201 })
    expect(r.success).toBe(false)
  })
  it('accepts valid amount', () => {
    const r = giftPointsSchema.safeParse({ amount: 100 })
    expect(r.success).toBe(true)
  })
})
