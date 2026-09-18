'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { recurringSchema } from '@/lib/validators/finance'

export type RecurringItem = {
  id: string
  type: 'income' | 'expense'
  amount_vnd: number
  start_date: string
  note: string | null
  active: boolean
  categories: { name: string; icon: string | null } | null
}

export async function createRecurring(raw: unknown): Promise<{ error: string | null }> {
  const parsed = recurringSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // ponytail: cast until database.ts regenerated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('recurring_transactions').insert({
    user_id: user.id,
    type: parsed.data.type,
    amount_vnd: parsed.data.amount_vnd,
    category_id: parsed.data.category_id ?? null,
    note: parsed.data.note ?? null,
    start_date: parsed.data.start_date,
  })

  if (error) return { error: error.message }
  revalidatePath('/finance/recurring')
  return { error: null }
}

export async function listRecurring(): Promise<RecurringItem[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // ponytail: cast until database.ts regenerated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('recurring_transactions')
    .select('*, categories(name, icon)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  return (data ?? []) as RecurringItem[]
}

export async function toggleRecurring(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // ponytail: cast until database.ts regenerated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('recurring_transactions')
    .select('active')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()
  if (!data) return { error: 'Không tìm thấy giao dịch' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('recurring_transactions')
    .update({ active: !data.active })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/finance/recurring')
  return { error: null }
}

export async function deleteRecurring(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('recurring_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/finance/recurring')
  return { error: null }
}
