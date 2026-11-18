import { createClient } from '@/lib/supabase/server'
import { Avatar, Badge, Card, CardBody, EmptyState } from '@/components/ui'

type LeaderboardRow = {
  display_name: string
  avatar_url: string | null
  total_referrals: number
}

export async function ReferralLeaderboard() {
  const supabase = await createClient()
  // ponytail: referral_leaderboard view not in generated types; add when types are regenerated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('referral_leaderboard')
    .select('display_name, avatar_url, total_referrals')
    .order('total_referrals', { ascending: false })
    .limit(10)

  const rows = (data ?? []) as LeaderboardRow[]

  return (
    <section className="space-y-3">
      <h2 className="text-h3 font-semibold">Bảng xếp hạng giới thiệu</h2>
      {rows.length === 0 ? (
        <EmptyState
          title="Chưa có ai trên bảng xếp hạng"
          description="Mời bạn bè để xuất hiện ở đây."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <Card key={index}>
              <CardBody className="flex items-center gap-3 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <Avatar src={row.avatar_url} fallback={row.display_name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {row.display_name}
                </span>
                <Badge variant="coin">{row.total_referrals} người</Badge>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
