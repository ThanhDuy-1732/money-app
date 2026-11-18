'use client'
import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { Amount, Button, Card, CardBody, Input } from '@/components/ui'
import { createVNPayOrder } from '@/features/wallet/actions/topup.actions'

const PRESETS = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000]
const RATE = 1 // 1 điểm / 1.000 VNĐ — keep in sync with the payment webhook

export function TopupForm() {
  const [amount, setAmount] = useState(50_000)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const points = Math.floor((amount / 1000) * RATE)

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await createVNPayOrder(amount)
      if (result.error || !result.url) {
        setError(result.error ?? 'Lỗi không xác định')
        return
      }
      window.location.href = result.url
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold">Chọn số tiền nạp</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESETS.map(preset => {
            const selected = amount === preset
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={selected}
                onClick={() => setAmount(preset)}
                className={`relative rounded-md border px-3 py-3 text-left transition-colors ${
                  selected
                    ? 'border-primary bg-secondary text-secondary-foreground'
                    : 'border-border bg-card text-foreground hover:border-primary/40'
                }`}
              >
                <span className="block text-sm font-semibold tabular">
                  {preset.toLocaleString('vi-VN')}đ
                </span>
                <span className="mt-0.5 block text-[10px] font-medium text-muted-foreground">
                  {Math.floor(preset / 1000)} điểm
                </span>
                {selected && <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="topup-amount" className="mb-2 block text-sm font-semibold">
          Hoặc nhập số tiền
        </label>
        <div className="flex items-center gap-2">
          <Input
            id="topup-amount"
            type="number"
            min={10_000}
            max={50_000_000}
            step={10_000}
            value={amount}
            onChange={e => setAmount(Number(e.target.value) || 0)}
            className="text-right tabular"
          />
          <span className="text-sm font-semibold text-muted-foreground">đ</span>
        </div>
      </div>

      <Card>
        <CardBody className="space-y-2 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Bạn nạp</span>
            <Amount value={amount} kind="vnd" />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Bạn nhận</span>
            <Amount value={points} kind="points" tone="coin" />
          </div>
          <p className="text-[11px] text-muted-foreground">Tỷ lệ: 1.000đ = 1 điểm.</p>
        </CardBody>
      </Card>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}

      <Button
        className="w-full"
        disabled={pending || amount < 10_000}
        loading={pending}
        onClick={handleSubmit}
      >
        {pending ? 'Đang xử lý...' : 'Thanh toán qua VNPay'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Sau khi thanh toán thành công, điểm sẽ được cộng tự động trong vài giây.
      </p>
    </div>
  )
}
