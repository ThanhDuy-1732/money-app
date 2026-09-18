'use client'

import { useState } from 'react'
import { contributeToGoal } from '@/features/finance/savings.actions'

export function ContributeForm({ goalId }: { goalId: string }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await contributeToGoal(goalId, Number(amount))
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setAmount('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <div className="flex-1">
        <label className="text-xs text-gray-500 mb-1 block">Góp thêm (VND)</label>
        <input
          type="number"
          min={1}
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Nhập số tiền..."
          className="w-full border rounded-lg px-3 py-2 text-sm"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm disabled:opacity-50"
      >
        {loading ? '...' : 'Góp'}
      </button>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </form>
  )
}
