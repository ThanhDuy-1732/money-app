'use client'

import { useState } from 'react'
import { inviteMember } from '@/features/finance/savings.actions'

type Member = {
  user_id: string
  profiles: { display_name: string | null; username: string | null; avatar_url: string | null } | null
}

export function GoalMemberList({
  goalId,
  members,
  isOwner,
}: {
  goalId: string
  members: Member[]
  isOwner: boolean
}) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await inviteMember(goalId, username.trim())
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setUsername('')
    }
  }

  return (
    <div className="space-y-3">
      {members.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa có thành viên nào.</p>
      ) : (
        <ul className="space-y-1">
          {members.map(m => (
            <li key={m.user_id} className="text-sm text-gray-700">
              {m.profiles?.display_name ?? m.profiles?.username ?? m.user_id}
            </li>
          ))}
        </ul>
      )}
      {isOwner && (
        <form onSubmit={handleInvite} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500 mb-1 block">Mời thành viên (username)</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Tên người dùng..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? '...' : 'Mời'}
          </button>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </form>
      )}
    </div>
  )
}
