'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todoSchema } from '@/lib/validators/finance'
import { getSubscriptionStatus, checkFreeLimit } from '@/features/billing/subscription.actions'

export async function createTodo(raw: unknown) {
  const parsed = todoSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    const { count } = await supabase
      .from('todos').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('done', false)
    const check = checkFreeLimit('activeTodos', count ?? 0)
    if (!check.allowed) return { error: check.error! }
  }

  const { error } = await supabase.from('todos').insert({
    user_id: user.id,
    title: parsed.data.title,
    due_date: parsed.data.due_date ?? null,
  })
  if (error) return { error: error.message }
  revalidatePath('/todos')
  return { error: null }
}

export async function toggleDone(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: todo } = await supabase.from('todos').select('done').eq('id', id).eq('user_id', user.id).single()
  if (!todo) return { error: 'Không tìm thấy' }

  const { error } = await supabase.from('todos').update({ done: !todo.done }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/todos')
  return { error: null }
}

export async function deleteTodo(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('todos').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/todos')
  return { error: null }
}
