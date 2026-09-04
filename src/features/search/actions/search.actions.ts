'use server'
import { createClient } from '@/lib/supabase/server'

export type SearchPost = {
  id: string
  content: string | null
  created_at: string
  profiles: { display_name: string; avatar_url: string | null }
}

export type SearchUser = {
  id: string
  display_name: string
  username: string | null
  avatar_url: string | null
}

export async function searchContent(
  query: string
): Promise<{ posts: SearchPost[]; users: SearchUser[] }> {
  const q = query.trim()
  if (!q) return { posts: [], users: [] }

  const supabase = await createClient()

  const [{ data: rawPosts }, { data: byName }, { data: byUser }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, content, created_at, profiles(display_name, avatar_url)')
      .eq('hidden', false)
      .is('deleted_at', null)
      .textSearch('content', q, { type: 'websearch', config: 'simple' })
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('profiles').select('id, display_name, username, avatar_url')
      .ilike('display_name', `%${q}%`).limit(10),
    supabase.from('profiles').select('id, display_name, username, avatar_url')
      .ilike('username', `%${q}%`).limit(10),
  ])

  const seen = new Set<string>()
  const rawUsers = [...(byName ?? []), ...(byUser ?? [])].filter(
    u => seen.has(u.id) ? false : !!seen.add(u.id)
  )

  return {
    posts: (rawPosts ?? []) as SearchPost[],
    users: rawUsers as SearchUser[],
  }
}
