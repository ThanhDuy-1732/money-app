'use client'
import { Input } from '@/components/ui'

export function OtpInput({
  value,
  onChange,
  id,
  invalid = false,
  'aria-describedby': ariaDescribedBy,
}: {
  value: string
  onChange: (v: string) => void
  id?: string
  invalid?: boolean
  'aria-describedby'?: string
}) {
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      aria-label="Mã OTP"
      aria-describedby={ariaDescribedBy}
      invalid={invalid}
      maxLength={6}
      placeholder="000000"
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="h-12 text-center font-mono text-2xl tracking-[0.4em]"
    />
  )
}
