'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { budgetSchema } from '@/lib/validators/finance'
import { getSubscriptionStatus, checkFreeLimit } from '@/features/billing/subscription.actions'

export async function upsertBudget(raw: unknown) {
  const parsed = budgetSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Free tier check: only on new budget creation, not edits
  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    const monthKey = `${parsed.data.month}` // already YYYY-MM-01 from schema
    const { count: existingCount } = await supabase
      .from('budgets').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('category_id', parsed.data.category_id).eq('month', monthKey)
    if ((existingCount ?? 0) === 0) {
      // New budget — enforce limit for this month only
      const { count } = await supabase
        .from('budgets').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('month', monthKey)
      const limitCheck = checkFreeLimit('budgets', count ?? 0)
      if (!limitCheck.allowed) return { error: limitCheck.error ?? 'Đã đạt giới hạn gói Free' }
    }
  }

  const { error } = await supabase.from('budgets').upsert({
    user_id: user.id,
    category_id: parsed.data.category_id,
    month: parsed.data.month, // YYYY-MM-01
    limit_amount: parsed.data.limit_amount,
  }, { onConflict: 'user_id,category_id,month' })

  if (error) return { error: error.message }
  revalidatePath('/finance/budgets')
  return { error: null }
}

export async function listBudgets(month: string) {
  // month: YYYY-MM
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('budgets')
    .select('*, categories(name, icon)')
    .eq('user_id', user.id)
    .eq('month', `${month}-01`)
  return data ?? []
}

export async function getBudgetProgress(categoryId: string, month: string) {
  // month: YYYY-MM
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { spent: 0, limit: 0 }

  const start = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const { data } = await supabase
    .from('transactions')
    .select('amount_vnd')
    .eq('user_id', user.id)
    .eq('category_id', categoryId)
    .eq('type', 'expense')
    .gte('occurred_at', start)
    .lt('occurred_at', nextMonth)

  const spent = (data ?? []).reduce((s, t) => s + t.amount_vnd, 0)

  const { data: budget } = await supabase
    .from('budgets')
    .select('limit_amount')
    .eq('user_id', user.id)
    .eq('category_id', categoryId)
    .eq('month', start)
    .single()

  return { spent, limit: budget?.limit_amount ?? 0 }
}
