'use server'
import { createClient } from '@/lib/supabase/server'

export async function resolveReferralCode(code: string): Promise<{ referrerId: string | null }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.rpc as any)('get_referrer_by_code', { p_code: code })
  return { referrerId: data ?? null }
}
