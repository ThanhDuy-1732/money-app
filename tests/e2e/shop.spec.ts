import { test, expect, chromium } from '@playwright/test'
import { loginAs } from './helpers/auth'

const ts = Date.now()
const buyer1Email = `e2e+shop1+${ts}@example.com`
const buyer2Email = `e2e+shop2+${ts}@example.com`

/**
 * Race condition test: two buyers simultaneously attempt to purchase the last code of a product.
 * Validates the FOR UPDATE SKIP LOCKED guard — at most one succeeds.
 *
 * Pre-condition: seed a shop product with exactly 1 code and sufficient points on both users.
 * If no product or no codes exist, both succeed=false and the assertion still passes.
 */
test('only one buyer wins when two race for the last shop code', async () => {
  const browser1 = await chromium.launch()
  const browser2 = await chromium.launch()

  try {
    const page1 = await browser1.newPage()
    const page2 = await browser2.newPage()

    await loginAs(page1, buyer1Email)
    await loginAs(page2, buyer2Email)

    // Navigate both to the shop listing
    await Promise.all([
      page1.goto('/shop'),
      page2.goto('/shop'),
    ])

    // Find the first product link on each page — skips gracefully if shop is empty
    const link1 = page1.locator('a[href^="/shop/"]').first()
    const link2 = page2.locator('a[href^="/shop/"]').first()

    const hasProduct = await link1.isVisible()
    if (!hasProduct) {
      // No products seeded — skip
      test.skip(!hasProduct, 'No shop products seeded; skipping race test')
      return
    }

    const href = await link1.getAttribute('href') ?? '/shop'
    await Promise.all([
      page1.goto(href),
      page2.goto(href),
    ])

    // Both click the buy button simultaneously
    const buyBtn1 = page1.locator('button:has-text("Mua bằng")')
    const buyBtn2 = page2.locator('button:has-text("Mua bằng")')

    await Promise.allSettled([
      buyBtn1.click().catch(() => {}),
      buyBtn2.click().catch(() => {}),
    ])

    // Wait briefly for navigation
    await Promise.all([
      page1.waitForTimeout(3000),
      page2.waitForTimeout(3000),
    ])

    // At most one should have reached /shop/orders
    const success1 = page1.url().includes('/shop/orders')
    const success2 = page2.url().includes('/shop/orders')

    // Core invariant: both cannot succeed (that would mean double-assignment of the same code)
    expect(success1 && success2).toBe(false)
  } finally {
    await browser1.close()
    await browser2.close()
  }
})
