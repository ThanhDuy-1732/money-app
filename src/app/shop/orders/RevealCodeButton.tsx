'use client'
import { useState } from 'react'
import { getOrderCode } from '@/features/shop/actions/shop.actions'

export function RevealCodeButton({ orderId }: { orderId: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function reveal() {
    setLoading(true)
    const { code: c } = await getOrderCode(orderId)
    setCode(c)
    setLoading(false)
  }

  if (code) return <p className="font-mono font-bold tracking-widest">{code}</p>
  return (
    <button
      onClick={reveal}
      disabled={loading}
      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
    >
      {loading ? 'Đang tải...' : 'Xem mã voucher'}
    </button>
  )
}
