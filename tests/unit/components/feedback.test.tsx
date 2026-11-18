import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Progress, Segmented, Tabs } from '@/components/ui'

describe('feedback primitives', () => {
  it('renders tabs and the active segmented option', () => {
    expect(
      renderToStaticMarkup(
        <Tabs items={[{ value: 'all', label: 'Tất cả' }]} value="all" onValueChange={() => {}} />
      )
    ).toContain('Tất cả')

    expect(
      renderToStaticMarkup(
        <Segmented options={[{ value: 'all', label: 'Tất cả' }]} value="all" onValueChange={() => {}} />
      )
    ).toContain('aria-pressed="true"')
  })

  it('exposes progress semantics, tone and clamping', () => {
    const html = renderToStaticMarkup(<Progress value={62} />)
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuenow="62"')
    expect(renderToStaticMarkup(<Progress value={95} tone="lotus" />)).toContain('bg-destructive')
    expect(renderToStaticMarkup(<Progress value={150} />)).toContain('aria-valuenow="100"')
  })
})
