'use client'
import { useState } from 'react'
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
      <p className="text-sm font-medium">Link mời của bạn:</p>
      <div className="flex gap-2">
        <code className="flex-1 text-xs bg-gray-100 rounded px-3 py-2 break-all">{link}</code>
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? '✓ Đã copy' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
