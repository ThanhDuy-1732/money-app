'use server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function getOrCreateReferralCode(): Promise<{ code: string | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { code: null, error: 'Chưa đăng nhập' }

  const code = crypto.createHash('sha256').update(user.id).digest('hex').slice(0, 8)
  return { code, error: null }
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
