'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { budgetSchema } from '@/lib/validators/finance'
import { FREE_LIMITS } from '@/lib/constants/limits'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'

export async function upsertBudget(raw: unknown) {
  const parsed = budgetSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Free tier check: count active budgets this month
  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    const thisMonth = new Date().toISOString().slice(0, 7)
    const { count } = await supabase
      .from('budgets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('month', `${thisMonth}-01`)
    if ((count ?? 0) >= FREE_LIMITS.budgets) {
      return { error: `Gói Free tối đa ${FREE_LIMITS.budgets} ngân sách/tháng. Nâng cấp Premium để tạo thêm.` }
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
