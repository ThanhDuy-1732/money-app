'use client'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { giftPoints } from '@/features/wallet/actions/gift.actions'

export function GiftPointsButton({ toUserId }: { toUserId: string }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(10)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await giftPoints(toUserId, amount)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setOpen(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50">
          🎁 Tặng điểm
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-xl w-80 space-y-4">
          <Dialog.Title className="font-bold text-lg">Tặng điểm</Dialog.Title>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-zinc-600">Số điểm (tối đa 200/ngày)</label>
              <input
                type="number"
                min={1}
                max={200}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Dialog.Close asChild>
                <button type="button" className="px-3 py-1.5 text-sm rounded-lg border">
                  Huỷ
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 text-sm rounded-lg bg-yellow-500 text-white font-medium disabled:opacity-50"
              >
                {loading ? 'Đang gửi...' : 'Tặng'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
