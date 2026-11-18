import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/app/globals.css', 'utf8')

describe('design tokens', () => {
  it('defines the semantic color, radius, container and shadow tokens', () => {
    for (const token of [
      '--color-primary', '--color-primary-foreground', '--color-card',
      '--color-muted-foreground', '--color-border', '--color-ring',
      '--color-coin', '--color-lotus', '--color-leaf',
      '--radius-sm', '--radius-lg', '--radius-2xl',
      '--shadow-sheet', '--container-narrow', '--container-wide', '--font-mono',
      '--text-display', '--text-h1', '--text-body', '--text-micro',
    ]) {
      expect(css).toContain(token)
    }
  })
})
