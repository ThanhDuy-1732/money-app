'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { savingsGoalSchema, savingsProgressSchema } from '@/lib/validators/finance'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'
import { checkFreeLimit } from '@/lib/constants/limits'

export async function createSavingsGoal(raw: unknown) {
  const parsed = savingsGoalSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    const { count } = await supabase
      .from('savings_goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    const limit = checkFreeLimit('savingsGoals', count ?? 0)
    if (!limit.allowed) return { error: limit.error! }
  }

  const { error } = await supabase.from('savings_goals').insert({
    user_id: user.id,
    name: parsed.data.name,
    target_amount: parsed.data.target_amount,
    target_date: parsed.data.target_date ?? null,
  })

  if (error) return { error: error.message }
  revalidatePath('/finance/goals')
  return { error: null }
}

export async function updateSavingsProgress(raw: unknown) {
  const parsed = savingsProgressSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('savings_goals')
    .update({ current_amount: parsed.data.current_amount })
    .eq('id', parsed.data.id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/finance/goals')
  return { error: null }
}

export async function listSavingsGoals() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return data ?? []
}
