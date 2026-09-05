'use server'
import { createClient } from '@/lib/supabase/server'

export async function getOrCreateReferralCode(): Promise<{ code: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { code: null, error: 'Chưa đăng nhập' }

  const { data: profile } = await supabase
    .from('profiles').select('referral_code').eq('id', user.id).single()
  // referral_code is set by DB trigger on insert — should always exist after migration 10 backfill
  return { code: profile?.referral_code ?? null, error: null }
}

export async function getReferralStats(): Promise<{
  total: number
  completed: number
  pointsEarned: number
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { total: 0, completed: 0, pointsEarned: 0 }

  // ponytail: uses get_referral_stats() RPC (migration 19) — reads referrals + points_ledger
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_referral_stats')
  if (error || !data || !Array.isArray(data) || data.length === 0) return { total: 0, completed: 0, pointsEarned: 0 }
  const row = data[0] as { total_invited: number; total_completed: number; points_earned: number }
  return { total: row.total_invited, completed: row.total_completed, pointsEarned: row.points_earned }
}
