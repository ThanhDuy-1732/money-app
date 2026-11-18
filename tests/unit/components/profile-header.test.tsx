import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Database } from '@/lib/types/database'
import { ProfileHeader } from '@/features/profile/components/ProfileHeader'

type Profile = Database['public']['Tables']['profiles']['Row']

const profile: Profile = {
  id: 'u1',
  display_name: 'Minh Anh',
  username: 'minhanh',
  avatar_url: null,
  bio: 'Tiết kiệm mỗi ngày',
  points_balance: 1250,
  streak_count: 7,
  role: 'user',
  locked: false,
  referral_code: 'abc',
  status: 'active',
  last_login_date: null,
  created_at: '',
  updated_at: '',
}

describe('ProfileHeader', () => {
  it('shows handle, bio, points and streak', () => {
    const html = renderToStaticMarkup(<ProfileHeader profile={profile} />)
    expect(html).toContain('@minhanh')
    expect(html).toContain('Tiết kiệm mỗi ngày')
    expect(html).toContain('1.250')
    expect(html).toContain('7 ngày')
  })
})
