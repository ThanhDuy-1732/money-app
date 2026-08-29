'use client'
import { useState } from 'react'
import { followUser, unfollowUser } from '../actions/profile.actions'
import { Button } from '@/components/ui'

export function FollowButton({ targetUserId, initialFollowing }: { targetUserId: string; initialFollowing: boolean }) {
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
    <Button variant={following ? 'outline' : 'default'} size="sm" onClick={toggle} disabled={loading}>
      {following ? 'Đang theo dõi' : 'Theo dõi'}
    </Button>
  )
}
