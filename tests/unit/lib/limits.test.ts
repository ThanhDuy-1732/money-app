import { describe, it, expect } from 'vitest'
import { FREE_LIMITS, PREMIUM_POINTS_COST } from '@/lib/constants/limits'

describe('FREE_LIMITS', () => {
  it('budgets limit is 3', () => expect(FREE_LIMITS.budgets).toBe(3))
  it('savingsGoals limit is 1', () => expect(FREE_LIMITS.savingsGoals).toBe(1))
  it('notes limit is 50', () => expect(FREE_LIMITS.notes).toBe(50))
  it('activeTodos limit is 20', () => expect(FREE_LIMITS.activeTodos).toBe(20))
})

describe('PREMIUM_POINTS_COST', () => {
  it('costs 500 points', () => expect(PREMIUM_POINTS_COST).toBe(500))
})
