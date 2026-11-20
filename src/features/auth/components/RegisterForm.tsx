'use client'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { registerSchema, otpSchema, type RegisterInput, type OtpInput } from '@/lib/validators/auth'
import { signUpWithEmail, verifyOtp } from '../actions/auth.actions'
import { Button, Field, Input } from '@/components/ui'
import { OtpInput as OtpInputComp } from './OtpInput'

export function RegisterForm() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const emailForm = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) })
  const otpValue = useWatch({ control: otpForm.control, name: 'otp' }) ?? ''

  async function onEmailSubmit(data: RegisterInput) {
    setServerError(null)
    const result = await signUpWithEmail(data.email, data.display_name)
    if (result.error) {
      setServerError(result.error)
      return
    }
    setEmail(data.email)
    setStep('otp')
  }

  async function onOtpSubmit(data: OtpInput) {
    setServerError(null)
    const result = await verifyOtp(email, data.otp)
    if (result?.error) setServerError(result.error)
  }

  const errorBanner = serverError ? (
    <p
      role="alert"
      className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
    >
      {serverError}
    </p>
  ) : null

  if (step === 'otp') {
    return (
      <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4" noValidate>
        <p className="text-sm text-muted-foreground">
          Nhập mã 6 số đã gửi đến <strong className="text-foreground">{email}</strong>
        </p>
        <Field label="Mã OTP" htmlFor="register-otp" error={otpForm.formState.errors.otp?.message}>
          <OtpInputComp
            id="register-otp"
            invalid={!!otpForm.formState.errors.otp}
            aria-describedby={otpForm.formState.errors.otp ? 'register-otp-error' : undefined}
            value={otpValue}
            onChange={(v: string) => otpForm.setValue('otp', v)}
          />
        </Field>
        {errorBanner}
        <Button type="submit" fullWidth loading={otpForm.formState.isSubmitting}>
          Xác nhận
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4" noValidate>
      <Field
        label="Tên hiển thị"
        htmlFor="register-name"
        error={emailForm.formState.errors.display_name?.message}
      >
        <Input
          id="register-name"
          placeholder="Minh Anh"
          autoComplete="name"
          invalid={!!emailForm.formState.errors.display_name}
          aria-describedby={
            emailForm.formState.errors.display_name ? 'register-name-error' : undefined
          }
          {...emailForm.register('display_name')}
        />
      </Field>
      <Field label="Email" htmlFor="register-email" error={emailForm.formState.errors.email?.message}>
        <Input
          id="register-email"
          type="email"
          placeholder="ban@example.com"
          autoComplete="email"
          invalid={!!emailForm.formState.errors.email}
          aria-describedby={emailForm.formState.errors.email ? 'register-email-error' : undefined}
          {...emailForm.register('email')}
        />
      </Field>
      {errorBanner}
      <Button type="submit" fullWidth loading={emailForm.formState.isSubmitting}>
        Đăng ký
      </Button>
    </form>
  )
}
