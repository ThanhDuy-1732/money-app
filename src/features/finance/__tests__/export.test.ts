import { describe, it, expect } from 'vitest'
import { buildCsvString } from '@/features/finance/export.actions'

describe('buildCsvString', () => {
  it('produces correct CSV headers', () => {
    const csv = buildCsvString([])
    expect(csv).toBe('Ngày,Loại,Danh mục,Số tiền (VND),Ghi chú\n')
  })

  it('produces correct rows', () => {
    const tx = [{
      occurred_at: '2026-09-01',
      type: 'expense' as const,
      categories: { name: 'Ăn uống', icon: '🍜', type: 'expense' },
      amount_vnd: 50000,
      note: 'Phở',
    }]
    const csv = buildCsvString(tx as Parameters<typeof buildCsvString>[0])
    expect(csv).toContain('2026-09-01,expense,Ăn uống,50000,Phở')
  })

  it('escapes commas in note', () => {
    const tx = [{
      occurred_at: '2026-09-01',
      type: 'income' as const,
      categories: null,
      amount_vnd: 1000000,
      note: 'Lương, thưởng',
    }]
    const csv = buildCsvString(tx as Parameters<typeof buildCsvString>[0])
    expect(csv).toContain('"Lương, thưởng"')
  })

  it('prevents spreadsheet formulas and keeps multiline notes in one cell', () => {
    const tx = [{
      occurred_at: '2026-09-01',
      type: 'expense' as const,
      categories: null,
      amount_vnd: 1000,
      note: '=HYPERLINK("https://example.com")\nnext line',
    }]
    const csv = buildCsvString(tx as Parameters<typeof buildCsvString>[0])
    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")\nnext line"')
  })
})
