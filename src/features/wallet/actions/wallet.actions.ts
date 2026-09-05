'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function redeemReward(rewardId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  // ponytail: cast needed until supabase gen types regenerates with real Function defs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('redeem_reward', { p_reward_id: rewardId })
  if (error) return { error: error.message }
  revalidatePath('/wallet')
  revalidatePath('/redeem')
  return { error: null }
}

export async function getBalance(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { data } = await supabase
    .from('profiles')
    .select('points_balance')
    .eq('id', user.id)
    .single()
  return data?.points_balance ?? 0
}
