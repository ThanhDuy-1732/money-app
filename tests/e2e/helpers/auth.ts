import type { Page } from '@playwright/test'
import { getLatestOtp } from './mail'

/**
 * Registers (fresh) and logs in as `email`.
 * Uses /register with display_name. OTP input selector: input[placeholder="000000"].
 */
export async function loginAs(page: Page, email: string, displayName = 'E2E User'): Promise<void> {
  await page.goto('/register')
  await page.fill('input[name="display_name"]', displayName)
  await page.fill('input[name="email"]', email)
  await page.click('button[type="submit"]')

  await page.locator('input[placeholder="000000"]').waitFor({ state: 'visible', timeout: 5000 })
  const otp = await getLatestOtp(email)
  await page.fill('input[placeholder="000000"]', otp)
  await page.click('button[type="submit"]')

  // Wait until we leave /register
  await page.waitForURL(url => !url.pathname.startsWith('/register'), { timeout: 10000 })
}
