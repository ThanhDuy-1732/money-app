'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { postSchema } from '@/lib/validators/post'

const IMAGE_STORAGE_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/`

export async function createPost(data: { content?: string; image_urls?: string[] }) {
  const parsed = postSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // Validate all image URLs are from our own storage bucket
  for (const url of parsed.data.image_urls ?? []) {
    if (!url.startsWith(IMAGE_STORAGE_PREFIX)) {
      return { error: 'URL ảnh không hợp lệ' }
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    content: parsed.data.content,
    image_urls: parsed.data.image_urls,
  })
  if (error) return { error: error.message }
  revalidatePath('/feed')
  return { error: null }
}

export async function likePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
  return { error: error?.message ?? null }
}

export async function unlikePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
  return { error: error?.message ?? null }
}

export async function createComment(postId: string, content: string) {
  if (content.trim().length === 0 || content.length > 300) return { error: 'Nội dung không hợp lệ' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Chưa đăng nhập' }
  const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content })
  if (error) return { error: error.message }
  revalidatePath('/feed')
  return { error: null }
}
