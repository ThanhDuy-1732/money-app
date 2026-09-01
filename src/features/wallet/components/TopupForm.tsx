'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui'
import { createVNPayOrder } from '@/features/wallet/actions/topup.actions'

const PRESETS = [10_000, 50_000, 100_000, 200_000, 500_000]
const RATE = 1 // 1 điểm / 1.000 VNĐ — ponytail: keep in sync with POINTS_PER_1000_VND in payment-webhook

export function TopupForm() {
  const [amount, setAmount] = useState(50_000)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      // IP obtained server-side; pass placeholder — server action reads req headers when possible
      // ponytail: pass real client IP via x-forwarded-for header if behind proxy
      const result = await createVNPayOrder(amount, '127.0.0.1')
      if (result.error || !result.url) { setError(result.error ?? 'Lỗi không xác định'); return }
      window.location.href = result.url
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium mb-2">Chọn số tiền nạp</p>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(p)}
              className={`rounded-lg border py-2 text-sm font-medium transition-colors
                ${amount === p
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'}`}
            >
              {p.toLocaleString('vi-VN')}đ
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Bạn sẽ nhận được{' '}
        <span className="font-semibold text-foreground">
          {Math.floor(amount / 1000 * RATE).toLocaleString('vi-VN')} điểm
        </span>
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button className="w-full" disabled={pending} onClick={handleSubmit}>
        {pending ? 'Đang xử lý...' : 'Thanh toán qua VNPay'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Sau khi thanh toán thành công, điểm sẽ được cộng tự động trong vài giây.
      </p>
    </div>
  )
}
