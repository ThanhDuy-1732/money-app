'use client'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { loginSchema, otpSchema, type LoginInput, type OtpInput } from '@/lib/validators/auth'
import { signInWithEmail, verifyOtp } from '../actions/auth.actions'
import { Button, Field, Input } from '@/components/ui'
import { OtpInput as OtpInputComp } from './OtpInput'

export function LoginForm() {
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  const emailForm = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const otpForm = useForm<OtpInput>({ resolver: zodResolver(otpSchema) })
  const otpValue = useWatch({ control: otpForm.control, name: 'otp' }) ?? ''

  async function onEmailSubmit(data: LoginInput) {
    setServerError(null)
    const result = await signInWithEmail(data.email)
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
      <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Mã OTP đã gửi đến <strong className="text-foreground">{email}</strong>
        </p>
        <Field label="Mã OTP" htmlFor="login-otp" error={otpForm.formState.errors.otp?.message}>
          <OtpInputComp
            id="login-otp"
            invalid={!!otpForm.formState.errors.otp}
            aria-describedby={otpForm.formState.errors.otp ? 'login-otp-error' : undefined}
            value={otpValue}
            onChange={(v: string) => otpForm.setValue('otp', v)}
          />
        </Field>
        {errorBanner}
        <Button type="submit" fullWidth loading={otpForm.formState.isSubmitting}>
          Đăng nhập
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
      <Field label="Email" htmlFor="login-email" error={emailForm.formState.errors.email?.message}>
        <Input
          id="login-email"
          type="email"
          placeholder="ban@example.com"
          autoComplete="email"
          invalid={!!emailForm.formState.errors.email}
          aria-describedby={emailForm.formState.errors.email ? 'login-email-error' : undefined}
          {...emailForm.register('email')}
        />
      </Field>
      {errorBanner}
      <Button type="submit" fullWidth loading={emailForm.formState.isSubmitting}>
        Tiếp tục
      </Button>
    </form>
  )
}
