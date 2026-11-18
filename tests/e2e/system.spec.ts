import { expect, test } from '@playwright/test'

test('unknown route shows the branded not-found', async ({ page }) => {
  await page.goto('/explore/this-route-does-not-exist')
  await expect(page.getByTestId('not-found')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Về trang chủ' })).toBeVisible()
})
