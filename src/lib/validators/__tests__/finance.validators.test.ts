import { describe, it, expect } from 'vitest'
import {
  transactionSchema, budgetSchema, savingsGoalSchema,
  noteSchema, todoSchema
} from '@/lib/validators/finance'

describe('transactionSchema', () => {
  it('rejects zero amount', () => {
    const r = transactionSchema.safeParse({ type: 'expense', amount_vnd: 0 })
    expect(r.success).toBe(false)
  })
  it('rejects negative amount', () => {
    const r = transactionSchema.safeParse({ type: 'expense', amount_vnd: -100 })
    expect(r.success).toBe(false)
  })
  it('rejects note over 200 chars', () => {
    const r = transactionSchema.safeParse({ type: 'income', amount_vnd: 1000, note: 'x'.repeat(201) })
    expect(r.success).toBe(false)
  })
  it('accepts valid expense', () => {
    const r = transactionSchema.safeParse({ type: 'expense', amount_vnd: 50000, note: 'coffee' })
    expect(r.success).toBe(true)
  })
  it('rejects invalid type', () => {
    const r = transactionSchema.safeParse({ type: 'transfer', amount_vnd: 1000 })
    expect(r.success).toBe(false)
  })
})

describe('budgetSchema', () => {
  it('rejects zero limit', () => {
    const r = budgetSchema.safeParse({ category_id: 'uuid', month: '2026-09-01', limit_amount: 0 })
    expect(r.success).toBe(false)
  })
  it('accepts valid budget', () => {
    const r = budgetSchema.safeParse({ category_id: 'some-uuid', month: '2026-09-01', limit_amount: 1000000 })
    expect(r.success).toBe(true)
  })
})

describe('savingsGoalSchema', () => {
  it('rejects empty name', () => {
    const r = savingsGoalSchema.safeParse({ name: '', target_amount: 1000000 })
    expect(r.success).toBe(false)
  })
  it('accepts valid goal', () => {
    const r = savingsGoalSchema.safeParse({ name: 'Mua xe', target_amount: 50000000 })
    expect(r.success).toBe(true)
  })
})

describe('noteSchema', () => {
  it('rejects title over 100 chars', () => {
    const r = noteSchema.safeParse({ title: 'x'.repeat(101) })
    expect(r.success).toBe(false)
  })
  it('rejects content over 5000 chars', () => {
    const r = noteSchema.safeParse({ content: 'x'.repeat(5001) })
    expect(r.success).toBe(false)
  })
  it('accepts empty note (title and content both optional)', () => {
    const r = noteSchema.safeParse({})
    expect(r.success).toBe(true)
  })
})

describe('todoSchema', () => {
  it('rejects empty title', () => {
    const r = todoSchema.safeParse({ title: '' })
    expect(r.success).toBe(false)
  })
  it('rejects title over 200 chars', () => {
    const r = todoSchema.safeParse({ title: 'x'.repeat(201) })
    expect(r.success).toBe(false)
  })
  it('accepts valid todo', () => {
    const r = todoSchema.safeParse({ title: 'Buy groceries' })
    expect(r.success).toBe(true)
  })
})
