import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'
import { FollowButton } from '@/features/profile/components/FollowButton'
import { FeedList } from '@/features/feed/components/FeedList'

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('display_name', username)
    .single()

  if (!profile) notFound()

  let isFollowing = false
  if (user && user.id !== profile.id) {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle()
    isFollowing = !!data
  }

  return (
    <main className="max-w-lg mx-auto px-4">
      <ProfileHeader profile={profile} />
      {user && user.id !== profile.id && (
        <div className="flex justify-center mb-6">
          <FollowButton targetUserId={profile.id} initialFollowing={isFollowing} />
        </div>
      )}
      <FeedList userId={profile.id} />
    </main>
  )
}
