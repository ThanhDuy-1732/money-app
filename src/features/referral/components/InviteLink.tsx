'use client'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui'

export function InviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${code}`

  async function copy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Link mời của bạn</p>
      <div className="flex gap-2">
        <code
          data-testid="referral-code"
          className="flex-1 break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm tracking-[0.12em]"
        >
          {code}
        </code>
        <Button size="sm" variant="outline" onClick={copy} aria-label="Sao chép mã mời">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Đã chép' : 'Sao chép'}
        </Button>
      </div>
    </div>
  )
}
