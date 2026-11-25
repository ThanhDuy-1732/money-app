'use server'
import { createClient } from '@/lib/supabase/server'
import { escapeLike } from '@/lib/escape-like'
import { POST_AUTHOR_EMBED } from '@/features/feed/post-select'

export type SearchPost = {
  id: string
  content: string | null
  created_at: string
  like_count: number
  comment_count: number
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

  const [{ data: rawPosts, error: postsError }, { data: byName }, { data: byUser }] = await Promise.all([
    supabase
      .from('posts')
      .select(`id, content, created_at, like_count, comment_count, ${POST_AUTHOR_EMBED}`)
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

  if (postsError) console.error('[search] posts query failed:', postsError.message)

  const seen = new Set<string>()
  const rawUsers = [...(byName ?? []), ...(byUser ?? [])].filter(
    u => seen.has(u.id) ? false : !!seen.add(u.id)
  )

  return {
    posts: (rawPosts ?? []) as SearchPost[],
    users: rawUsers as SearchUser[],
  }
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
