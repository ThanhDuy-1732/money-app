'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { noteSchema } from '@/lib/validators/finance'
import { getSubscriptionStatus, checkFreeLimit } from '@/features/billing/subscription.actions'

export async function createNote(raw: unknown) {
  const parsed = noteSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { isPremium } = await getSubscriptionStatus()
  if (!isPremium) {
    const { count } = await supabase
      .from('notes').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
    const check = checkFreeLimit('notes', count ?? 0)
    if (!check.allowed) return { error: check.error! }
  }

  const { error } = await supabase.from('notes').insert({
    user_id: user.id,
    title: parsed.data.title ?? null,
    content: parsed.data.content ?? null,
  })
  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { error: null }
}

export async function updateNote(id: string, raw: unknown) {
  const parsed = noteSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('notes')
    .update({ title: parsed.data.title ?? null, content: parsed.data.content ?? null })
    .eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { error: null }
}

export async function togglePin(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { data: note } = await supabase.from('notes').select('pinned').eq('id', id).eq('user_id', user.id).single()
  if (!note) return { error: 'Không tìm thấy ghi chú' }

  const { error } = await supabase.from('notes').update({ pinned: !note.pinned }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { error: null }
}

export async function deleteNote(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { error: null }
}
