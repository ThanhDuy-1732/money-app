import { expect, test } from '@playwright/test'

test('feed requires authentication', async ({ page }) => {
  await page.goto('/feed')
  await expect(page).toHaveURL(/\/login/)
})
