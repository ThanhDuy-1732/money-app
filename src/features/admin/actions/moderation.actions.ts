'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Chưa đăng nhập')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (p?.role !== 'admin') throw new Error('Không có quyền admin')
  return supabase
}

export async function listUsers(limit = 100) {
  const supabase = await requireAdmin()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, username, role, locked, points_balance, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function lockUser(userId: string): Promise<void> {
  const supabase = await requireAdmin()
  const { data: target, error } = await supabase.from('profiles').select('role').eq('id', userId).single()
  if (error || !target) throw new Error('User not found')
  if (target.role === 'admin') throw new Error('Cannot lock admin users')
  await supabase.from('profiles').update({ locked: true }).eq('id', userId)
  revalidatePath('/admin/users')
}

export async function unlockUser(userId: string): Promise<void> {
  const supabase = await requireAdmin()
  const { data: target, error } = await supabase.from('profiles').select('role').eq('id', userId).single()
  if (error || !target) throw new Error('User not found')
  if (target.role === 'admin') throw new Error('Cannot unlock admin users')
  await supabase.from('profiles').update({ locked: false }).eq('id', userId)
  revalidatePath('/admin/users')
}

export async function listPosts(limit = 100) {
  const supabase = await requireAdmin()
  const { data } = await supabase
    .from('posts')
    .select('id, content, hidden, created_at, profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function hidePost(postId: string) {
  const supabase = await requireAdmin()
  await supabase.from('posts').update({ hidden: true }).eq('id', postId)
  revalidatePath('/admin/posts')
}

export async function unhidePost(postId: string) {
  const supabase = await requireAdmin()
  await supabase.from('posts').update({ hidden: false }).eq('id', postId)
  revalidatePath('/admin/posts')
}
