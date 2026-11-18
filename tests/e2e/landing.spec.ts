import { expect, test } from '@playwright/test'

test('landing shows the polymer hero and CTAs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Quản lý tiền của bạn/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nhận 50 điểm khi đăng ký' })).toBeVisible()
  await expect(page.getByTestId('landing-note')).toBeVisible()
})
