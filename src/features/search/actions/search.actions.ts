'use server'
import { createClient } from '@/lib/supabase/server'
import { escapeLike } from '@/lib/escape-like'
import type { PostCardPost } from '@/features/feed/components/PostCard'

export type SearchPost = {
  id: string
  content: string | null
  created_at: string
  tags?: string[] | null
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
  // Escape LIKE metacharacters so literal % and _ in queries don't act as wildcards
  const likeQ = escapeLike(q)

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
      .ilike('display_name', `%${likeQ}%`).limit(10),
    supabase.from('profiles').select('id, display_name, username, avatar_url')
      .ilike('username', `%${likeQ}%`).limit(10),
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

export async function searchByTag(tag: string): Promise<PostCardPost[]> {
  if (!tag) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('*, profiles(display_name, avatar_url), comments(*, profiles(display_name, avatar_url))')
    .eq('hidden', false)
    .is('deleted_at', null)
    .contains('tags', [tag.toLowerCase()])
    .order('created_at', { ascending: false })
    .limit(30)
  return (data ?? []) as PostCardPost[]
}

/**
 * Returns up to 5 post content snippets that fuzzily match the partial query.
 * Uses pg_trgm similarity — handles missing diacritics and partial words.
 * Requires migration 17 (pg_trgm + immutable_unaccent indexes).
 */
export async function autocompleteSearch(partial: string): Promise<string[]> {
  const p = partial.trim()
  if (p.length < 2) return []
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('autocomplete_posts', { p_query: p, p_limit: 5 })
  if (error || !data) return []
  return (data as Array<{ content: string }>).map(r =>
    r.content.length > 60 ? r.content.slice(0, 60) + '…' : r.content
  )
}
