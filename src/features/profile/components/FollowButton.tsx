'use client'
import { useState } from 'react'
import { UserCheck, UserPlus } from 'lucide-react'
import { followUser, unfollowUser } from '../actions/profile.actions'
import { Button } from '@/components/ui'

export function FollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: string
  initialFollowing: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    if (following) await unfollowUser(targetUserId)
    else await followUser(targetUserId)
    setFollowing(f => !f)
    setLoading(false)
  }

  return (
    <Button
      variant={following ? 'outline' : 'default'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      aria-pressed={following}
    >
      {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {following ? 'Đang theo dõi' : 'Theo dõi'}
    </Button>
  )
}
