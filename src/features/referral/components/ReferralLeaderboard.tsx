import { createClient } from '@/lib/supabase/server'

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
  if (rows.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Bảng xếp hạng giới thiệu</h2>
      <ol className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <span className="w-6 text-center text-sm font-bold text-zinc-400">{i + 1}</span>
            {row.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            )}
            <span className="flex-1 text-sm font-medium">{row.display_name}</span>
            <span className="text-sm text-zinc-500">{row.total_referrals} người</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
