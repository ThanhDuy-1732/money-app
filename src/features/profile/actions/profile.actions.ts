'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { editProfileSchema } from '@/lib/validators/profile'

export async function updateProfile(formData: { display_name: string; bio?: string }) {
  const parsed = editProfileSchema.safeParse(formData)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.data.display_name, bio: parsed.data.bio ?? null })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/profile')
  return { error: null }
}
