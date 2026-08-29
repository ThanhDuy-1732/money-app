'use client'
import { Input } from '@/components/ui'

export function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      maxLength={6}
      placeholder="000000"
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      className="text-center text-2xl tracking-widest"
    />
  )
}
