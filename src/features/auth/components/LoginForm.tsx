'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { loginSchema, otpSchema, type LoginInput, type OtpInput } from '@/lib/validators/auth'
import { signInWithEmail, verifyOtp } from '../actions/auth.actions'
import { Button, Input } from '@/components/ui'
import { OtpInput as OtpInputComp } from './OtpInput'

export function LoginForm() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const emailForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) })

  async function onEmailSubmit(data: LoginInput) {
    setServerError(null)
    const result = await signInWithEmail(data.email)
    if (result.error) { setServerError(result.error); return }
    setEmail(data.email)
    setStep('otp')
  }

  async function onOtpSubmit(data: OtpInput) {
    setServerError(null)
    const result = await verifyOtp(email, data.otp)
    if (result?.error) setServerError(result.error)
  }

  if (step === 'otp') return (
    <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
      <p className="text-sm text-gray-600">Mã OTP đã gửi đến <strong>{email}</strong></p>
      <OtpInputComp
        value={otpForm.watch('otp') ?? ''}
        onChange={(v: string) => otpForm.setValue('otp', v)}
      />
      {otpForm.formState.errors.otp && <p className="text-sm text-red-500">{otpForm.formState.errors.otp.message}</p>}
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
        {otpForm.formState.isSubmitting ? 'Đang xác nhận...' : 'Đăng nhập'}
      </Button>
    </form>
  )

  return (
    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
      <Input type="email" placeholder="Email" {...emailForm.register('email')} />
      {emailForm.formState.errors.email && <p className="text-sm text-red-500">{emailForm.formState.errors.email.message}</p>}
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
        {emailForm.formState.isSubmitting ? 'Đang gửi...' : 'Tiếp tục'}
      </Button>
    </form>
  )
}
