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
  const { data, error } = await supabase.rpc('get_finance_trend', { p_months: months })
  if (error) return { error: error.message }

  const rows = (data ?? []) as { month: string; total_income: number; total_expense: number }[]
  return rows.map((row) => ({
    month: row.month,
    total_income: Number(row.total_income),
    total_expense: Number(row.total_expense),
    net: Number(row.total_income) - Number(row.total_expense),
  }))
}
