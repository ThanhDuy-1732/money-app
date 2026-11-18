import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('admin pages', () => {
  it('marks each admin surface with a stable test id', () => {
    expect(readFileSync('src/app/admin/page.tsx', 'utf8')).toContain(
      'data-testid="admin-dashboard"'
    )
    expect(readFileSync('src/app/admin/users/page.tsx', 'utf8')).toContain(
      'data-testid="admin-users"'
    )
    expect(readFileSync('src/app/admin/posts/page.tsx', 'utf8')).toContain(
      'data-testid="admin-posts"'
    )
    expect(readFileSync('src/app/admin/shop/page.tsx', 'utf8')).toContain(
      'data-testid="admin-shop"'
    )
  })
})
