import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('shop page', () => {
  it('marks product cards with a stable test id', () => {
    expect(readFileSync('src/app/shop/page.tsx', 'utf8')).toContain('data-testid="shop-card"')
  })
})
