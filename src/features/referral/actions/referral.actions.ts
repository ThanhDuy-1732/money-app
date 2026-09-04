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

export async function getReferralStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { total: 0, rewarded: 0 }

  const { data } = await supabase
    .from('referrals')
    .select('status')
    .eq('referrer_id', user.id)

  return {
    total: data?.length ?? 0,
    rewarded: data?.filter(r => r.status === 'rewarded').length ?? 0,
  }
}
