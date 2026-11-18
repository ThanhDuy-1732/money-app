import { expect, test } from '@playwright/test'

test('finance requires authentication', async ({ page }) => {
  await page.goto('/finance')
  await expect(page).toHaveURL(/\/login/)
})
