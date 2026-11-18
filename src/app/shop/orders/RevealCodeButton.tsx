'use client'
import { useState } from 'react'
import { Eye } from 'lucide-react'
import { getOrderCode } from '@/features/shop/actions/shop.actions'
import { Button } from '@/components/ui'

export function RevealCodeButton({ orderId }: { orderId: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function reveal() {
    setLoading(true)
    const { code: nextCode } = await getOrderCode(orderId)
    setCode(nextCode)
    setLoading(false)
  }

  if (code) {
    return (
      <code className="block break-all rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm font-bold tracking-widest">
        {code}
      </code>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={reveal} loading={loading}>
      <Eye className="h-4 w-4" />
      Xem mã voucher
    </Button>
  )
}
