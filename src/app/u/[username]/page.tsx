import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FollowButton } from '@/features/profile/components/FollowButton'
import { FeedList } from '@/features/feed/components/FeedList'
import { Amount, Avatar, Badge, Button, SecurityThread, WatermarkCoin } from '@/components/ui'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: byUsername } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .maybeSingle()

  let profile = byUsername

  if (!profile) {
    const { data: byDisplayName } = await supabase
      .from('profiles')
      .select('*')
      .eq('display_name', username)
      .maybeSingle()
    profile = byDisplayName
  }

  if (!profile && UUID_RE.test(username)) {
    const { data: byId } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', username)
      .maybeSingle()
    profile = byId
  }

  if (!profile) notFound()

  const isSelf = user?.id === profile.id
  let isFollowing = false

  if (user && !isSelf) {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle()
    isFollowing = !!data
  }

  return (
    <main className="mx-auto max-w-default px-4 py-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="relative h-24 bg-secondary">
          <SecurityThread className="absolute left-8 top-0 h-full -rotate-6" />
          <WatermarkCoin className="-bottom-8 right-4" size={120} opacity={0.08} />
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end justify-between gap-3">
            <Avatar
              src={profile.avatar_url}
              fallback={profile.display_name}
              size="xl"
              className="ring-4 ring-card"
            />
            <div className="flex gap-2 pb-1">
              {isSelf ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/profile">Chỉnh sửa hồ sơ</Link>
                </Button>
              ) : user ? (
                <FollowButton targetUserId={profile.id} initialFollowing={isFollowing} />
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            <h1 className="text-h1 font-extrabold tracking-tight">{profile.display_name}</h1>
            {profile.username && (
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="mt-2 max-w-prose text-sm text-muted-foreground">{profile.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="coin">
                <Amount value={profile.points_balance} kind="points" tone="coin" />
              </Badge>
              <Badge variant="neutral">{profile.streak_count} ngày liên tiếp</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <FeedList userId={user?.id} authorId={profile.id} />
      </div>
    </main>
  )
}
