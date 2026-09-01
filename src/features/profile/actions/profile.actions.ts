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

export async function followUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId })
  if (error) return { error: error.message }
  revalidatePath(`/u/${targetUserId}`)
  return { error: null }
}

export async function unfollowUser(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId)
  revalidatePath(`/u/${targetUserId}`)
  return { error: null }
}

export async function updateAvatarUrl(avatarUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  // Only accept URLs from our own Supabase storage bucket, under this user's folder
  const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`
  if (!avatarUrl.startsWith(storagePrefix)) {
    return { error: 'URL avatar không hợp lệ' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)
  if (error) return { error: error.message }
  return { error: null }
}
