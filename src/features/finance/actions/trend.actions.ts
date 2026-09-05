'use server'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionStatus } from '@/features/billing/subscription.actions'

export type TrendRow = {
  month: string // YYYY-MM-DD (first of month)
  total_income: number
  total_expense: number
  net: number
}

export async function getFinanceTrend(months = 6): Promise<TrendRow[] | { error: string }> {
  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) return { error: 'premium_required' }

  const supabase = await createClient()
  // ponytail: cast to any — rpc types don't include get_finance_trend; add to generated types when supabase types are regenerated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('get_finance_trend', { p_months: months })
  if (error) return { error: (error as { message: string }).message }

  const rows = (data ?? []) as { month: string; total_income: number; total_expense: number }[]
  return rows.map((row) => ({
    month: row.month,
    total_income: Number(row.total_income),
    total_expense: Number(row.total_expense),
    net: Number(row.total_income) - Number(row.total_expense),
  }))
}
