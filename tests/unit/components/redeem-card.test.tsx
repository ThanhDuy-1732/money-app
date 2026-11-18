import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RedeemCard } from '@/features/wallet/components/RedeemCard'

describe('RedeemCard', () => {
  it('shows the reward cost in points', () => {
    const html = renderToStaticMarkup(
      <RedeemCard
        userBalance={500}
        reward={{
          id: '1',
          name: 'Huy hiệu',
          description: null,
          points_cost: 200,
          stock: null,
          active: true,
          created_at: '',
        }}
      />
    )
    expect(html).toContain('200')
    expect(html).toContain('điểm')
  })
})
