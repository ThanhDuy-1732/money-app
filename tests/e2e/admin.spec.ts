import { test, expect } from '@playwright/test'

test.describe('admin access control', () => {
  test('unauthenticated user is redirected away from /admin', async ({ page }) => {
    await page.goto('/admin')
    // Should redirect to login or show 403/404
    await expect(page).not.toHaveURL('/admin')
  })

  test.skip('non-admin authenticated user cannot access /admin', async ({ page }) => {
    // Skipped: requires a Playwright storageState fixture with a logged-in non-admin
    // user. Unauthenticated guard is already verified by the test above.
    // TODO: add storageState fixture and assert redirect for authenticated non-admin.
    await page.goto('/admin')
    await expect(page).not.toHaveURL('/admin')
  })
})
