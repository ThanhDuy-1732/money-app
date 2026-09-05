import { test, expect } from '@playwright/test'
import { getLatestOtp } from './helpers/mail'

// Unique email per run to avoid inbox collision
const testEmail = `e2e+auth+${Date.now()}@example.com`

// Serial: second test depends on first test having registered the account
test.describe.serial('auth flow', () => {
  test('user can register with OTP', async ({ page }) => {
    await page.goto('/register')
    await page.fill('input[name="display_name"]', 'E2E Tester')
    await page.fill('input[name="email"]', testEmail)
    await page.click('button[type="submit"]')

    // OtpInput has no name attr — placeholder="000000" is the stable selector
    await expect(page.locator('input[placeholder="000000"]')).toBeVisible({ timeout: 5000 })

    const otp = await getLatestOtp(testEmail)
    await page.fill('input[placeholder="000000"]', otp)
    await page.click('button[type="submit"]')

    // After successful registration, redirect away from /register
    await expect(page).not.toHaveURL(/\/register/)
  })

  test('registered user can log in', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', testEmail)
    await page.click('button[type="submit"]')

    await expect(page.locator('input[placeholder="000000"]')).toBeVisible({ timeout: 5000 })

    const otp = await getLatestOtp(testEmail)
    await page.fill('input[placeholder="000000"]', otp)
    await page.click('button[type="submit"]')

    // After successful login, redirect away from /login
    await expect(page).not.toHaveURL(/\/login/)
  })
})
