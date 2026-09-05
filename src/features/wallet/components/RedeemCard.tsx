'use client'
import { useState } from 'react'
import { redeemReward } from '../actions/wallet.actions'
import { Button, Badge } from '@/components/ui'
import type { Database } from '@/lib/types/database'

type Reward = Database['public']['Tables']['rewards']['Row']

export function RedeemCard({ reward, userBalance }: { reward: Reward; userBalance: number }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const canAfford = userBalance >= reward.points_cost

  async function handleRedeem() {
    setLoading(true)
    setError(null)
    const result = await redeemReward(reward.id)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    setSuccess(true)
  }

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <h3 className="font-medium text-sm">{reward.name}</h3>
        <Badge variant={canAfford ? 'success' : 'warning'}>{reward.points_cost}đ</Badge>
      </div>
      {reward.description && <p className="text-xs text-gray-500">{reward.description}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {success
        ? <p className="text-xs text-green-600">✓ Đã đổi thành công!</p>
        : (
          <Button
            size="sm"
            variant={canAfford ? 'default' : 'outline'}
            disabled={!canAfford || loading}
            onClick={handleRedeem}
            className="w-full"
          >
            {loading ? 'Đang xử lý...' : canAfford ? 'Đổi ngay' : 'Không đủ điểm'}
          </Button>
        )
      }
    </div>
  )
}
