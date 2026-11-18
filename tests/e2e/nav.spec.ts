import { expect, test } from '@playwright/test'

test('mobile more sheet opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/design/shell')
  await page.getByRole('button', { name: 'Thêm' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
})
