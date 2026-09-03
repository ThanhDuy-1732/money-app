'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { transactionSchema } from '@/lib/validators/finance'

export async function createTransaction(raw: unknown) {
  const parsed = transactionSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('transactions').insert({
    user_id: user.id,
    type: parsed.data.type,
    amount_vnd: parsed.data.amount_vnd,
    category_id: parsed.data.category_id ?? null,
    note: parsed.data.note ?? null,
    occurred_at: parsed.data.occurred_at ?? new Date().toISOString().slice(0, 10),
  })

  if (error) return { error: error.message }
  revalidatePath('/finance')
  return { error: null }
}

export async function listTransactions(month: string) {
  // month: YYYY-MM (e.g. '2026-09')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { transactions: [], totalIncome: 0, totalExpense: 0 }

  const start = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const { data } = await supabase
    .from('transactions')
    .select('*, categories(name, icon, type)')
    .eq('user_id', user.id)
    .gte('occurred_at', start)
    .lt('occurred_at', nextMonth)
    .order('occurred_at', { ascending: false })

  const transactions = data ?? []
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_vnd, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_vnd, 0)
  return { transactions, totalIncome, totalExpense }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('transactions').delete()
    .eq('id', id).eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/finance')
  return { error: null }
}
