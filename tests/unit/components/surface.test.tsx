import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Avatar, Badge, Card, EmptyState, PageHeader } from '@/components/ui'

describe('surface primitives', () => {
  it('renders card tones and badge variants', () => {
    expect(renderToStaticMarkup(<Card tone="paper">A</Card>)).toContain('bg-card')
    expect(renderToStaticMarkup(<Badge variant="lotus">Chi</Badge>)).toContain('bg-destructive')
  })

  it('renders avatar sizes', () => {
    expect(renderToStaticMarkup(<Avatar fallback="Minh Anh" size="xl" />)).toContain('h-20')
  })

  it('renders a page header and an empty state with an action', () => {
    const header = renderToStaticMarkup(
      <PageHeader title="Ví điểm" description="Số dư" actions={<button>Nạp</button>} />
    )
    expect(header).toContain('<h1')
    expect(header).toContain('Nạp')

    const empty = renderToStaticMarkup(
      <EmptyState title="Chưa có giao dịch" description="Nạp điểm để bắt đầu" action={<button>Nạp điểm</button>} />
    )
    expect(empty).toContain('Chưa có giao dịch')
    expect(empty).toContain('Nạp điểm')
  })
})
