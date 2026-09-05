import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const walletEmail = `e2e+wallet+${Date.now()}@example.com`

test.describe('wallet topup via VNPAY_MOCK', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, walletEmail)
  })

  test('balance updates after mock topup', async ({ page }) => {
    await page.goto('/wallet')
    const before = await page.locator('[data-testid="balance"]').textContent()

    // Navigate to topup — preset buttons, no amount input
    await page.goto('/wallet/topup')
    // 50.000đ preset is the default; click it explicitly to be safe
    await page.locator('button:has-text("50.000")').click()
    await page.getByText('Thanh toán qua VNPay').click()

    // Mock VNPay page — click pay button
    await page.waitForURL(/mock\/vnpay/, { timeout: 10000 })
    await page.getByText('Thanh toán (Mock)').click()

    // Should redirect back to wallet after successful mock payment
    await page.waitForURL(/wallet/, { timeout: 10000 })

    const after = await page.locator('[data-testid="balance"]').textContent()
    expect(after).not.toBe(before)
  })
})
