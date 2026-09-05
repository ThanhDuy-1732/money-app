import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const ts = Date.now()

test.describe.serial('admin access control', () => {
  test('unauthenticated user is redirected away from /admin', async ({ page }) => {
    await page.goto('/admin')
    // Should redirect to login or show 403/404
    await expect(page).not.toHaveURL('/admin')
  })

  test('non-admin authenticated user cannot access /admin', async ({ page }) => {
    // Register a fresh user — any newly registered user is non-admin by default
    await loginAs(page, `e2e+admin+${ts}@example.com`, 'Non-Admin User')
    await page.goto('/admin')
    await expect(page).not.toHaveURL('/admin')
  })
})
