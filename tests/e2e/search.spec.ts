import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const searchEmail = `e2e+search+${Date.now()}@example.com`

test.describe('search', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, searchEmail)
  })

  test('LIKE metacharacters do not cause server error', async ({ page }) => {
    await page.goto('/explore?q=' + encodeURIComponent('100%'))
    await expect(page.locator('body')).not.toContainText('Error')
    await expect(page.locator('body')).not.toContainText('500')

    await page.goto('/explore?q=' + encodeURIComponent('hello_world'))
    await expect(page.locator('body')).not.toContainText('Error')
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('backslash in search does not crash', async ({ page }) => {
    await page.goto('/explore?q=' + encodeURIComponent('C:\\test'))
    await expect(page.locator('body')).not.toContainText('Error')
    await expect(page.locator('body')).not.toContainText('500')
  })
})
