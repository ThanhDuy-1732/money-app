import { describe, it, expect } from 'vitest'
import { recurringSchema } from '@/lib/validators/finance'

describe('recurringSchema', () => {
  it('rejects zero amount', () => {
    const r = recurringSchema.safeParse({ type: 'expense', amount_vnd: 0, start_date: '2026-09-01' })
    expect(r.success).toBe(false)
  })
  it('rejects invalid type', () => {
    const r = recurringSchema.safeParse({ type: 'transfer', amount_vnd: 100000, start_date: '2026-09-01' })
    expect(r.success).toBe(false)
  })
  it('rejects invalid date format', () => {
    const r = recurringSchema.safeParse({ type: 'expense', amount_vnd: 100000, start_date: '01-09-2026' })
    expect(r.success).toBe(false)
  })
  it('rejects a calendar date that does not exist', () => {
    expect(recurringSchema.safeParse({ type: 'expense', amount_vnd: 100000, start_date: '2026-09-31' }).success).toBe(false)
  })
  it('accepts valid recurring', () => {
    const r = recurringSchema.safeParse({ type: 'expense', amount_vnd: 3000000, start_date: '2026-09-30' })
    expect(r.success).toBe(true)
  })
})

describe('date formula correctness', () => {
  // Pure logic test: verify formula avoids day-31 drift
  it('day-31 formula: start_date + N months (not additive)', () => {
    // Simulate what PostgreSQL does: always add from start_date, clamp to month end
    function nextRunDate(startDate: string, occurrencesRun: number): string {
      const [year, mon, day] = startDate.split('-').map(Number)
      const rawMonth = mon - 1 + occurrencesRun
      const targetYear = year + Math.floor(rawMonth / 12)
      const targetMon = rawMonth % 12
      const lastDay = new Date(targetYear, targetMon + 1, 0).getDate()
      const d = Math.min(day, lastDay)
      return `${targetYear}-${String(targetMon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    }
    // Jan 31 + 1 month = Feb 28 (or 29), then + another month from Jan 31 + 2 = Mar 31
    const start = '2026-01-31'
    expect(nextRunDate(start, 1)).toBe('2026-02-28') // or 29 in leap year
    expect(nextRunDate(start, 2)).toBe('2026-03-31') // back to 31, not stuck at 28
    expect(nextRunDate(start, 3)).toBe('2026-04-30')
  })
})
