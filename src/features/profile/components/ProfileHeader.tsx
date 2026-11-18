import { Amount, Avatar, Badge } from '@/components/ui'
import type { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export function ProfileHeader({
  profile,
  showStats = true,
}: {
  profile: Profile
  showStats?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Avatar src={profile.avatar_url} fallback={profile.display_name} size="xl" ring />
      <div>
        <h1 className="text-h2 font-extrabold tracking-tight">{profile.display_name}</h1>
        {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
      </div>
      {profile.bio && <p className="max-w-sm text-sm text-muted-foreground">{profile.bio}</p>}
      {showStats && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="coin">
            <Amount value={profile.points_balance} kind="points" tone="coin" />
          </Badge>
          <Badge variant="neutral">{profile.streak_count} ngày liên tiếp</Badge>
        </div>
      )}
    </div>
  )
}
