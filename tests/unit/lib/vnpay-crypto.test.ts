import { describe, it, expect } from 'vitest'
import { vnpaySign, timingSafeCompare } from '@/lib/vnpay-crypto'

const SECRET = 'testsecret'

describe('vnpaySign', () => {
  it('produces a 128-char hex string', () => {
    const sig = vnpaySign({ vnp_Amount: '10000', vnp_TxnRef: 'abc' }, SECRET)
    expect(sig).toHaveLength(128)
    expect(sig).toMatch(/^[0-9a-f]+$/)
  })
  it('is deterministic', () => {
    const params = { vnp_Amount: '10000', vnp_TxnRef: 'abc' }
    expect(vnpaySign(params, SECRET)).toBe(vnpaySign(params, SECRET))
  })
  it('sorts params before signing', () => {
    const a = vnpaySign({ b: '2', a: '1' }, SECRET)
    const b = vnpaySign({ a: '1', b: '2' }, SECRET)
    expect(a).toBe(b)
  })
  it('produces different signature for different secret', () => {
    const params = { vnp_Amount: '10000' }
    expect(vnpaySign(params, SECRET)).not.toBe(vnpaySign(params, 'othersecret'))
  })
})

describe('timingSafeCompare', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeCompare('abc123', 'abc123')).toBe(true)
  })
  it('returns false for different strings of same length', () => {
    expect(timingSafeCompare('abc123', 'xyz789')).toBe(false)
  })
  it('returns false for different lengths', () => {
    expect(timingSafeCompare('short', 'longer')).toBe(false)
  })
  it('returns true for empty strings', () => {
    expect(timingSafeCompare('', '')).toBe(true)
  })
})
