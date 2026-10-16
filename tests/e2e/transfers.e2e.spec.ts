import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
const creativeEmail = 'creative@framehouseworks.com'
const creativePassword = 'password123'

test.describe('FRH-67 Link Transfer Generation (E2E)', () => {
  test('end-to-end transfer lifecycle: upload, generate link, recipient download, and sender delete', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)

    // Create unique test deliverable file
    const uniqueFilename = `deliverable-${Date.now()}.zip`
    const tempFilePath = path.join(os.tmpdir(), uniqueFilename)
    fs.writeFileSync(tempFilePath, 'E2E_DELIVERABLE_STREAM_TEST_CONTENT_BITSTREAM', 'utf-8')

    try {
      // ── 1. Sign in as creative user via API to establish session cookie ────
      const loginResponse = await page.request.post(`${baseURL}/api/users/login`, {
        data: {
          email: creativeEmail,
          password: creativePassword,
        },
      })
      expect(loginResponse.ok()).toBe(true)

      // ── 2. Navigate to Transfers Workbench ─────────────────────────────────
      await page.goto(`${baseURL}/dashboard/transfers`, { waitUntil: 'load' })
      await expect(
        page.getByRole('heading', { name: 'File Transfers', exact: true }),
      ).toBeVisible({
        timeout: 20_000,
      })

      // ── 3. Stage file and provide metadata ──────────────────────────────────
      const fileInput = page.locator('input[aria-label="Select file for transfer"]')
      await fileInput.setInputFiles(tempFilePath)

      // Verify staged card renders with correct filename
      await expect(page.getByText(uniqueFilename)).toBeVisible({ timeout: 10_000 })

      // Fill in custom title & message
      const customTitle = `Client Master Pack ${Date.now()}`
      await page.locator('#transfer-title').fill(customTitle)
      await page.locator('#transfer-message').fill('Final approved delivery file. Please review.')

      // ── 4. Trigger upload & generate link ───────────────────────────────────
      const getLinkBtn = page.getByRole('button', { name: /get a link/i })
      await expect(getLinkBtn).toBeEnabled()

      // Click "Get a link" and wait for Payload REST registration
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/api/transfers') && r.request().method() === 'POST',
          { timeout: 30_000 },
        ),
        getLinkBtn.click(),
      ])

      // ── 5. Verify READY state & public URL extraction ──────────────────────
      await expect(page.getByText(/link ready/i)).toBeVisible({ timeout: 20_000 })
      const linkInput = page.locator('input[readonly]')
      await expect(linkInput).toBeVisible()
      const publicUrl = await linkInput.inputValue()
      expect(publicUrl).toContain('/transfer/tr_')

      // ── 6. Public recipient download in incognito (unauthenticated) context ─
      const recipientContext = await browser.newContext()
      const recipientPage = await recipientContext.newPage()

      await recipientPage.goto(publicUrl, { waitUntil: 'load' })

      // Verify presentation card renders with correct metadata
      await expect(recipientPage.getByRole('heading', { name: customTitle })).toBeVisible({
        timeout: 15_000,
      })
      await expect(recipientPage.getByText(uniqueFilename)).toBeVisible()
      await expect(recipientPage.getByText(/final approved delivery file/i)).toBeVisible()
      await expect(recipientPage.getByText(/sent by/i)).toBeVisible()

      // Click download button and verify download stream
      const downloadButton = recipientPage.getByRole('button', { name: /download file/i })
      await expect(downloadButton).toBeVisible()

      const [download] = await Promise.all([
        recipientPage.waitForEvent('download', { timeout: 15_000 }),
        downloadButton.click(),
      ])

      expect(download.suggestedFilename()).toBe(uniqueFilename)
      await expect(recipientPage.getByRole('button', { name: /download again/i })).toBeVisible()

      await recipientContext.close()

      // ── 7. Sender deletes the transfer from workbench ────────────────────────
      await page.goto(`${baseURL}/dashboard/transfers`, { waitUntil: 'load' })
      await expect(page.getByText(customTitle)).toBeVisible({ timeout: 15_000 })

      // Locate the delete button for this transfer row using data-testid and click it
      const transferRow = page.locator('[data-testid="transfer-row"]', { hasText: customTitle }).first()
      const deleteButton = transferRow.getByRole('button', { name: /delete/i })
      await expect(deleteButton).toBeVisible({ timeout: 10_000 })

      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/api/transfers/') && r.request().method() === 'DELETE',
          { timeout: 15_000 },
        ),
        deleteButton.click(),
      ])

      // Verify row is removed from list
      await expect(page.getByText(customTitle)).not.toBeVisible({ timeout: 10_000 })

      // ── 8. Recipient accesses deleted link & verifies unavailable state ────
      const secondContext = await browser.newContext()
      const postDeletePage = await secondContext.newPage()
      await postDeletePage.goto(publicUrl, { waitUntil: 'load' })

      await expect(postDeletePage.getByText(/transfer link not found|transfer unavailable/i)).toBeVisible({
        timeout: 15_000,
      })

      await secondContext.close()
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }
    }
  })
})
