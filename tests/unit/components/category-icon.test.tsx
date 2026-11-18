import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CategoryIcon } from '@/components/ui/category-icon'

describe('CategoryIcon', () => {
  it('maps a known category emoji to a lucide icon', () => {
    expect(renderToStaticMarkup(<CategoryIcon icon="🍜" />)).toContain('data-icon="utensils"')
  })
  it('falls back to Tag for unknown or null values', () => {
    expect(renderToStaticMarkup(<CategoryIcon icon="🛸" />)).toContain('data-icon="tag"')
    expect(renderToStaticMarkup(<CategoryIcon icon={null} />)).toContain('data-icon="tag"')
  })
})
