'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { savingsGoalSchema, savingsProgressSchema, goalContributionSchema } from '@/lib/validators/finance'
import { getSubscriptionStatus, checkFreeLimit } from '@/features/billing/subscription.actions'

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
    const limit = await checkFreeLimit('savingsGoals', count ?? 0)
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
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function inviteMember(
  goalId: string,
  username: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: goal } = await supabase
    .from('savings_goals')
    .select('id')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single()
  if (!goal) return { error: 'Không có quyền mời thành viên' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()
  if (!profile) return { error: 'Không tìm thấy người dùng' }
  if (profile.id === user.id) return { error: 'Không thể mời chính mình' }

  // ponytail: cast needed — savings_goal_members not in generated types yet; regenerate when migrations run
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('savings_goal_members')
    .insert({ goal_id: goalId, user_id: profile.id })

  if (error) {
    if (error.code === '23505') return { error: 'Người này đã là thành viên' }
    return { error: error.message }
  }

  revalidatePath(`/finance/goals/${goalId}`)
  return { error: null }
}

export async function contributeToGoal(
  goalId: string,
  rawAmount: unknown
): Promise<{ error: string | null }> {
  const parsed = goalContributionSchema.safeParse({ amount: rawAmount })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // ponytail: cast needed — savings_goal_contributions not in generated types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('savings_goal_contributions')
    .insert({ goal_id: goalId, user_id: user.id, amount: parsed.data.amount })

  if (error) return { error: error.message }

  revalidatePath(`/finance/goals/${goalId}`)
  return { error: null }
}

export async function listGoalMembers(goalId: string) {
  const supabase = await createClient()
  // ponytail: cast needed — savings_goal_members not in generated types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('savings_goal_members')
    .select('user_id, profiles(display_name, avatar_url, username)')
    .eq('goal_id', goalId)
  return { members: (data ?? []) as Array<{ user_id: string; profiles: { display_name: string | null; avatar_url: string | null; username: string | null } | null }> }
}
