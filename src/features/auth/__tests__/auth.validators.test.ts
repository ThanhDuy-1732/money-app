import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema, otpSchema } from '@/lib/validators/auth'

describe('registerSchema', () => {
  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({ email: 'notanemail', display_name: 'Test' })
    expect(result.success).toBe(false)
  })
  it('rejects display_name shorter than 2 chars', () => {
    const result = registerSchema.safeParse({ email: 'a@b.com', display_name: 'A' })
    expect(result.success).toBe(false)
  })
  it('accepts valid input', () => {
    const result = registerSchema.safeParse({ email: 'a@b.com', display_name: 'Alice' })
    expect(result.success).toBe(true)
  })
})

describe('otpSchema', () => {
  it('rejects non-numeric OTP', () => {
    const result = otpSchema.safeParse({ otp: 'abc123' })
    expect(result.success).toBe(false)
  })
  it('rejects OTP not 6 digits', () => {
    const result = otpSchema.safeParse({ otp: '12345' })
    expect(result.success).toBe(false)
  })
  it('accepts valid 6-digit OTP', () => {
    const result = otpSchema.safeParse({ otp: '123456' })
    expect(result.success).toBe(true)
  })
})
