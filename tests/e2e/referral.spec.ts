import { test, expect } from '@playwright/test'
import { getLatestOtp } from './helpers/mail'

const ts = Date.now()
const referrerEmail = `e2e+referrer+${ts}@example.com`
const referredEmail = `e2e+referred+${ts}@example.com`

test.describe('referral flow', () => {
  test('new user linked to referrer when signing up via /register?ref=CODE', async ({ page }) => {
    // Step 1: Register referrer
    await page.goto('/register')
    await page.fill('input[name="display_name"]', 'Referrer')
    await page.fill('input[name="email"]', referrerEmail)
    await page.click('button[type="submit"]')
    await page.locator('input[placeholder="000000"]').waitFor({ state: 'visible', timeout: 5000 })
    const otp1 = await getLatestOtp(referrerEmail)
    await page.fill('input[placeholder="000000"]', otp1)
    await page.click('button[type="submit"]')
    await page.waitForURL(url => !url.pathname.startsWith('/register'), { timeout: 10000 })

    // Step 2: Get referral code from /invite
    // data-testid="referral-code" is on the <code> element showing the bare code
    await page.goto('/invite')
    const code = await page.locator('[data-testid="referral-code"]').textContent()
    expect(code).toBeTruthy()

    // Step 3: Referred user signs up via /register?ref=CODE
    await page.goto(`/register?ref=${code}`)
    await page.fill('input[name="display_name"]', 'Referred User')
    await page.fill('input[name="email"]', referredEmail)
    await page.click('button[type="submit"]')
    await page.locator('input[placeholder="000000"]').waitFor({ state: 'visible', timeout: 5000 })
    const otp2 = await getLatestOtp(referredEmail)
    await page.fill('input[placeholder="000000"]', otp2)
    await page.click('button[type="submit"]')
    await page.waitForURL(url => !url.pathname.startsWith('/register'), { timeout: 10000 })

    // Step 4: Log back in as referrer and check invite stats
    // Re-login the same page as referrer
    await page.goto('/login')
    await page.fill('input[name="email"]', referrerEmail)
    await page.click('button[type="submit"]')
    await page.locator('input[placeholder="000000"]').waitFor({ state: 'visible', timeout: 5000 })
    const otp3 = await getLatestOtp(referrerEmail)
    await page.fill('input[placeholder="000000"]', otp3)
    await page.click('button[type="submit"]')
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 10000 })

    await page.goto('/invite')
    // data-testid="referral-total" wraps the count number
    const totalText = await page.locator('[data-testid="referral-total"]').textContent()
    expect(Number(totalText)).toBeGreaterThanOrEqual(1)
  })
})
