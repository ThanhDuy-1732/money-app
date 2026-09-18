import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const senderEmail = `e2e+gift+sender+${Date.now()}@example.com`
const receiverEmail = `e2e+gift+receiver+${Date.now()}@example.com`
const receiverName = `Gift Receiver ${Date.now().toString().slice(-8)}`

test.describe('gift points flow', () => {
  test('sender gifts points → recipient balance increases', async ({ browser }) => {
    // Two separate browser contexts = two sessions
    const senderCtx = await browser.newContext()
    const receiverCtx = await browser.newContext()
    const senderPage = await senderCtx.newPage()
    const receiverPage = await receiverCtx.newPage()

    await loginAs(senderPage, senderEmail, `Gift Sender ${Date.now().toString().slice(-8)}`)
    await loginAs(receiverPage, receiverEmail, receiverName)

    // Get receiver's balance before
    await receiverPage.goto('/wallet')
    const balanceBefore = Number((await receiverPage.locator('[data-testid="balance"]').textContent())?.replace(/\D/g, ''))

    // Sender navigates to receiver's profile and gifts points
    await senderPage.goto(`/u/${encodeURIComponent(receiverName)}`)
    await senderPage.getByRole('button', { name: /Tặng điểm/ }).click()
    await senderPage.getByRole('dialog').locator('input[type="number"]').fill('10')
    await senderPage.getByRole('button', { name: 'Tặng', exact: true }).click()

    // Wait for success (modal closes)
    await expect(senderPage.getByRole('dialog')).toBeHidden()

    // Receiver balance should increase
    await receiverPage.reload()
    const balanceAfter = Number((await receiverPage.locator('[data-testid="balance"]').textContent())?.replace(/\D/g, ''))
    expect(balanceAfter).toBe(balanceBefore + 10)

    await senderCtx.close()
    await receiverCtx.close()
  })
})
