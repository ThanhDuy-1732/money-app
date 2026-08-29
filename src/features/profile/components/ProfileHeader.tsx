import { Avatar, Badge } from '@/components/ui'
import type { Database } from '@/lib/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <Avatar src={profile.avatar_url} fallback={profile.display_name} className="h-20 w-20" />
      <h1 className="text-xl font-bold">{profile.display_name}</h1>
      {profile.bio && <p className="text-sm text-gray-600 text-center max-w-sm">{profile.bio}</p>}
      <div className="flex gap-4 text-sm text-gray-500">
        <Badge variant="default">{profile.points_balance} điểm</Badge>
        <span>Streak: {profile.streak_count} ngày 🔥</span>
      </div>
    </div>
  )
}
