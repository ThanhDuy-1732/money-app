'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { FREE_LIMITS, PREMIUM_POINTS_COST } from '@/lib/constants/limits'

export async function getSubscriptionStatus(): Promise<{ isPremium: boolean; expiresAt: Date | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { isPremium: false, expiresAt: null }

  const { data } = await supabase
    .from('subscriptions')
    .select('status, expires_at')
    .eq('user_id', user.id)
    .single()

  if (!data || data.status !== 'active') return { isPremium: false, expiresAt: null }
  const expiresAt = new Date(data.expires_at)
  if (expiresAt < new Date()) return { isPremium: false, expiresAt: null }
  return { isPremium: true, expiresAt }
}

export async function subscribeWithPoints() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.rpc('subscribe_premium_with_points')
  if (error) return { error: error.message } // Includes "balance insufficient" from points_ledger check
  revalidatePath('/billing/upgrade')
  return { error: null }
}

export function checkFreeLimit(
  feature: keyof typeof FREE_LIMITS,
  currentCount: number
): { allowed: boolean; error?: string } {
  if (currentCount >= FREE_LIMITS[feature]) {
    return { allowed: false, error: `Đã đạt giới hạn ${FREE_LIMITS[feature]} cho gói Free` }
  }
  return { allowed: true }
}
