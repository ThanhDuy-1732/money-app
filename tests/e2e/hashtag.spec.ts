import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const email = `e2e+hashtag+${Date.now()}@example.com`
const tag = `e2etest${Date.now()}`

test.describe('hashtag flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, email)
  })

  test('post with hashtag → tag link appears → explore page shows post', async ({ page }) => {
    // Create a post with a unique hashtag
    await page.goto('/feed')
    await page.getByPlaceholder('Bạn đang nghĩ gì?').fill(
      `Testing hashtags #${tag} #${tag.toUpperCase()} ${Array.from({ length: 10 }, (_, i) => `#x${i}`).join(' ')}`
    )
    await page.getByRole('button', { name: 'Đăng' }).click()

    // Duplicate tags collapse and at most 10 distinct tags are stored.
    const post = page.locator('article').filter({ hasText: `Testing hashtags #${tag}` }).first()
    await expect(post.locator('a[href^="/explore/tag/"]')).toHaveCount(10)
    await expect(post.locator(`a[href="/explore/tag/${tag}"]`)).toHaveCount(1)

    // Navigate to explore page for this tag
    await post.locator(`a[href="/explore/tag/${tag}"]`).click()
    await page.waitForURL(`/explore/tag/${tag}`)

    // Post should appear on explore page
    await expect(page.locator(`text=#${tag}`).first()).toBeVisible()
    await expect(page.locator(`text=Testing hashtags`)).toBeVisible()
  })
})
