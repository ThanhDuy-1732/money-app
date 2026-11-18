import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Database } from '@/lib/types/database'

vi.mock('@/features/feed/actions/feed.actions', () => ({
  likePost: vi.fn(),
  unlikePost: vi.fn(),
  createComment: vi.fn(),
}))

import { PostCard } from '@/features/feed/components/PostCard'

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: { display_name: string; avatar_url: string | null }
  comments: Array<
    Database['public']['Tables']['comments']['Row'] & {
      profiles: { display_name: string; avatar_url: string | null }
    }
  >
  user_liked?: boolean
}

const post: Post = {
  id: 'p1',
  user_id: 'u1',
  content: 'Xin chào',
  image_urls: [],
  like_count: 2,
  comment_count: 1,
  created_at: new Date().toISOString(),
  deleted_at: null,
  hidden: false,
  profiles: { display_name: 'Minh Anh', avatar_url: null },
  comments: [],
}

describe('PostCard', () => {
  it('renders the author, content and icon actions', () => {
    const html = renderToStaticMarkup(<PostCard post={post} currentUserId="u2" />)
    expect(html).toContain('Minh Anh')
    expect(html).toContain('Xin chào')
    expect(html).toContain('data-icon="heart"')
    expect(html).toContain('data-icon="message-circle"')
  })
})
