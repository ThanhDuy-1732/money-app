'use client'
import { useState } from 'react'
import { redeemReward } from '../actions/wallet.actions'
import {
  Amount,
  Badge,
  Button,
  Card,
  CardBody,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui'
import type { Database } from '@/lib/types/database'

type Reward = Database['public']['Tables']['rewards']['Row']

export function RedeemCard({ reward, userBalance }: { reward: Reward; userBalance: number }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const soldOut = reward.stock === 0
  const canAfford = userBalance >= reward.points_cost
  const canRedeem = canAfford && !soldOut
  const remaining = userBalance - reward.points_cost

  async function handleRedeem() {
    setLoading(true)
    setError(null)
    const result = await redeemReward(reward.id)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess(true)
    setOpen(false)
  }

  const errorBanner = error ? (
    <p
      role="alert"
      className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive"
    >
      {error}
    </p>
  ) : null

  return (
    <Card data-testid="redeem-card">
      <CardBody className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold">{reward.name}</h3>
            {reward.description && (
              <p className="mt-1 text-xs text-muted-foreground">{reward.description}</p>
            )}
          </div>
          <Badge variant={canRedeem ? 'coin' : 'neutral'}>
            <Amount
              value={reward.points_cost}
              kind="points"
              tone={canRedeem ? 'coin' : 'default'}
            />
          </Badge>
        </div>

        {reward.stock !== null && (
          <p className="text-[11px] text-muted-foreground">Còn {reward.stock} lượt</p>
        )}

        {errorBanner}

        {success ? (
          <Badge variant="leaf">Đã đổi thành công</Badge>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant={canRedeem ? 'default' : 'outline'}
                disabled={!canRedeem}
                className="w-full"
              >
                {soldOut ? 'Hết lượt' : canAfford ? 'Đổi ngay' : 'Không đủ điểm'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="text-h3 font-semibold">Đổi “{reward.name}”?</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Bạn sẽ dùng {reward.points_cost.toLocaleString('vi-VN')} điểm. Số dư còn lại:{' '}
                {remaining.toLocaleString('vi-VN')} điểm.
              </DialogDescription>
              {errorBanner}
              <div className="mt-4 flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="ghost">Hủy</Button>
                </DialogClose>
                <Button onClick={handleRedeem} loading={loading}>
                  Xác nhận
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardBody>
    </Card>
  )
}
