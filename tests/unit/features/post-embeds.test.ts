import { describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ urls: [] as string[] }))

vi.mock('@/lib/supabase/server', async () => {
  const { createClient } = await import('@supabase/supabase-js')
  const client = createClient('https://example.supabase.co', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input: RequestInfo | URL) => {
        h.urls.push(String(input))
        return new Response('[]', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    },
  })
  return { createClient: async () => client }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { fetchFeedPage } from '@/features/feed/actions/feed.actions'
import { POST_AUTHOR_EMBED } from '@/features/feed/post-select'
import { searchContent } from '@/features/search/actions/search.actions'

describe('post queries embed the author unambiguously', () => {
  it('uses the posts_user_id_fkey relationship name', () => {
    expect(POST_AUTHOR_EMBED).toBe('profiles!posts_user_id_fkey(display_name, avatar_url)')
  })

  it('fetches the feed with the disambiguated author embed', async () => {
    h.urls.length = 0
    await fetchFeedPage(null, 'user-1', true)
    const postsUrl = h.urls.find((url) => url.includes('/rest/v1/posts?'))
    expect(postsUrl).toBeDefined()
    expect(decodeURIComponent(postsUrl!)).toContain('profiles!posts_user_id_fkey')
  })

  it('searches posts with the disambiguated author embed', async () => {
    h.urls.length = 0
    await searchContent('QA')
    const postsUrl = h.urls.find((url) => url.includes('/rest/v1/posts?'))
    expect(postsUrl).toBeDefined()
    expect(decodeURIComponent(postsUrl!)).toContain('profiles!posts_user_id_fkey')
  })
})
