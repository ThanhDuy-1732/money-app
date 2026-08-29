import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  display_name: z.string().min(2, 'Tên tối thiểu 2 ký tự').max(30, 'Tên tối đa 30 ký tự'),
})

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
})

export const otpSchema = z.object({
  otp: z.string().length(6, 'Mã OTP gồm 6 số').regex(/^\d+$/, 'Chỉ nhập số'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type OtpInput = z.infer<typeof otpSchema>
