import { expect, test } from '@playwright/test'

test('design playground renders the kit', async ({ page }) => {
  await page.goto('/design')
  await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible()
  await expect(page.getByText('The Note')).toBeVisible()
})
