'use server'
import { createClient } from '@/lib/supabase/server'

export async function recordLogin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('profiles')
    .update({ last_login_date: today })
    .eq('id', user.id)
  // DB trigger trg_login_streak handles streak_count and points
}
