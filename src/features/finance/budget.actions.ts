'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { budgetSchema } from '@/lib/validators/finance'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'
import { FREE_LIMITS } from '@/lib/constants/limits'

export async function upsertBudget(raw: unknown) {
  const parsed = budgetSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Atomic upsert with per-user advisory lock in DB (09b migration).
  // Free tier limit enforced inside the RPC; premium users get p_max_budgets=999.
  const { isPremium } = await getSubscriptionStatus()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('upsert_budget_with_limit', {
    p_category_id: parsed.data.category_id,
    p_month: parsed.data.month, // YYYY-MM-01
    p_limit_amount: parsed.data.limit_amount,
    p_max_budgets: isPremium ? 999 : FREE_LIMITS.budgets,
  })
  if (error) return { error: error.message }
  const result = data as { error: string | null }
  if (result.error) return { error: result.error }

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
