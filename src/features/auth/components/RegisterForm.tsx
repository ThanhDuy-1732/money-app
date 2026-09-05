'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { registerSchema, otpSchema, type RegisterInput, type OtpInput } from '@/lib/validators/auth'
import { signUpWithEmail, verifyOtp } from '../actions/auth.actions'
import { Button, Input } from '@/components/ui'
import { OtpInput as OtpInputComp } from './OtpInput'

export function RegisterForm() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const emailForm = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) })

  async function onEmailSubmit(data: RegisterInput) {
    setServerError(null)
    const result = await signUpWithEmail(data.email, data.display_name)
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
      <p className="text-sm text-gray-600">Nhập mã 6 số đã gửi đến <strong>{email}</strong></p>
      <OtpInputComp
        value={otpForm.watch('otp') ?? ''}
        onChange={(v: string) => otpForm.setValue('otp', v)}
      />
      {otpForm.formState.errors.otp && <p className="text-sm text-red-500">{otpForm.formState.errors.otp.message}</p>}
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
        {otpForm.formState.isSubmitting ? 'Đang xác nhận...' : 'Xác nhận'}
      </Button>
    </form>
  )

  return (
    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
      <div>
        <Input placeholder="Tên hiển thị" {...emailForm.register('display_name')} />
        {emailForm.formState.errors.display_name && <p className="text-sm text-red-500">{emailForm.formState.errors.display_name.message}</p>}
      </div>
      <div>
        <Input type="email" placeholder="Email" {...emailForm.register('email')} />
        {emailForm.formState.errors.email && <p className="text-sm text-red-500">{emailForm.formState.errors.email.message}</p>}
      </div>
      {serverError && <p className="text-sm text-red-500">{serverError}</p>}
      <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
        {emailForm.formState.isSubmitting ? 'Đang gửi...' : 'Đăng ký'}
      </Button>
    </form>
  )
}
