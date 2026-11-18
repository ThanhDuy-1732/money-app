import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('productivity pages', () => {
  it('marks the read-only pages with stable test ids', () => {
    expect(readFileSync('src/app/notes/page.tsx', 'utf8')).toContain('data-testid="notes-page"')
    expect(readFileSync('src/app/todos/page.tsx', 'utf8')).toContain('data-testid="todos-page"')
  })
})
