import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Amount, Note, Serial } from '@/components/ui'

describe('money components', () => {
  it('formats points, VND, large values and negatives', () => {
    expect(renderToStaticMarkup(<Amount value={1250} kind="points" />)).toContain('1.250')
    expect(renderToStaticMarkup(<Amount value={1250} kind="points" />)).toContain('điểm')
    expect(renderToStaticMarkup(<Amount value={50000} kind="vnd" />)).toContain('50.000')
    expect(renderToStaticMarkup(<Amount value={1000000000} kind="vnd" />)).toContain('1.000.000.000')
    expect(renderToStaticMarkup(<Amount value={-150} kind="points" />)).toContain('−150')
    expect(renderToStaticMarkup(<Amount value={18500000} kind="vnd" sign="plus" />)).toContain('+18.500.000')
    expect(renderToStaticMarkup(<Amount value={11240000} kind="vnd" sign="minus" />)).toContain('−11.240.000')
  })

  it('formats a serial and renders the note', () => {
    expect(renderToStaticMarkup(<Serial value="7f2a19c4" />)).toContain('7F2A 19C4')
    const note = renderToStaticMarkup(
      <Note points={1250} serial="0042 8817" streak={7} rank="Người khai phá" />
    )
    expect(note).toContain('1.250')
    expect(note).toContain('SỐ VÍ')
    expect(note).toContain('7 ngày')
  })

  it('disables coin motion under reduced motion', () => {
    const css = readFileSync('src/app/globals.css', 'utf8')
    expect(css).toContain('prefers-reduced-motion')
  })
})
