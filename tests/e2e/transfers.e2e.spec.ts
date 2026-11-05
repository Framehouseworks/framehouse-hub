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

      // ── FRH-82: Test Inline Preview Toggle on Recipient Page ───────────────
      const previewButton = recipientPage.getByRole('button', { name: /preview/i })
      await expect(previewButton).toBeVisible()
      await previewButton.click()

      // For .zip format, verify fallback card renders with download rationale
      await expect(recipientPage.getByText(/not supported for inline browser preview|download to fetch/i)).toBeVisible({
        timeout: 10_000,
      })

      // Click "Hide" to verify collapse
      const hideButton = recipientPage.getByRole('button', { name: /hide/i })
      await expect(hideButton).toBeVisible()
      await hideButton.click()
      await expect(recipientPage.getByRole('button', { name: /preview/i })).toBeVisible()

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

      // ── 9. Verify on-disk storage cleanup of all transfer files & directories ──
      const shareHashMatch = publicUrl.match(/tr_[a-f0-9]+/)
      if (shareHashMatch) {
        const shareHash = shareHashMatch[0]
        const mediaRoot = path.resolve(process.cwd(), 'public/media/transfers')
        if (fs.existsSync(mediaRoot)) {
          // Verify no enclave directory with this shareHash exists under any user directory
          const userDirs = fs.readdirSync(mediaRoot)
          for (const uDir of userDirs) {
            const enclavePath = path.join(mediaRoot, uDir, shareHash)
            expect(fs.existsSync(enclavePath)).toBe(false)
          }
        }
      }
    } finally {
      // Clean up local temp staging file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath)
      }
    }
  })

  test('FRH-70: Password protected transfer gate and independent lockout per transfer link', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)

    // Sign in as creative user
    const loginResponse = await page.request.post(`${baseURL}/api/users/login`, {
      data: {
        email: creativeEmail,
        password: creativePassword,
      },
    })
    expect(loginResponse.ok()).toBe(true)

    // Create Transfer A with password
    const createResA = await page.request.post(`${baseURL}/api/transfers`, {
      data: {
        filename: 'Secure_Asset_A.pdf',
        filesize: 1024 * 1024,
        mimeType: 'application/pdf',
        storagePath: 'transfers/creative/tr_e2e_a/original/Secure_Asset_A.pdf',
        status: 'active',
        passwordEnabled: true,
        _password: 'PasswordAlpha123!',
      },
    })
    expect(createResA.ok()).toBe(true)
    const transferA = await createResA.json()
    const shareHashA = transferA.doc?.shareHash || transferA.shareHash

    // Create Transfer B with password
    const createResB = await page.request.post(`${baseURL}/api/transfers`, {
      data: {
        filename: 'Secure_Asset_B.pdf',
        filesize: 1024 * 1024,
        mimeType: 'application/pdf',
        storagePath: 'transfers/creative/tr_e2e_b/original/Secure_Asset_B.pdf',
        status: 'active',
        passwordEnabled: true,
        _password: 'PasswordBeta123!',
      },
    })
    expect(createResB.ok()).toBe(true)
    const transferB = await createResB.json()
    const shareHashB = transferB.doc?.shareHash || transferB.shareHash

    const recipientContext = await browser.newContext()
    const recipientPage = await recipientContext.newPage()

    try {
      // ── 1. Visit Transfer A: verify metadata is suppressed and password form is shown ──
      await recipientPage.goto(`${baseURL}/transfer/${shareHashA}`, { waitUntil: 'load' })
      await expect(recipientPage.getByRole('heading', { name: /protected transfer/i })).toBeVisible({
        timeout: 15_000,
      })
      await expect(recipientPage.getByText(/password protected/i)).toBeVisible()
      // Ensure file title and metadata are hidden
      await expect(recipientPage.getByText('Secure_Asset_A.pdf')).not.toBeVisible()

      // ── 2. Enter incorrect password 5 times to trigger rate limit lockout ──
      const passwordInput = recipientPage.locator('input[type="password"]')
      const unlockButton = recipientPage.getByRole('button', { name: /unlock transfer/i })

      for (let i = 0; i < 5; i++) {
        await passwordInput.fill(`WrongPassword${i}`)
        await Promise.all([
          recipientPage.waitForResponse(
            (r) => r.url().includes('/verify-password') && r.status() === 401,
            { timeout: 10_000 },
          ),
          unlockButton.click(),
        ])
        await expect(recipientPage.getByText(/incorrect password/i)).toBeVisible({ timeout: 5000 })
      }

      // 6th attempt on Transfer A: verify 429 lockout message is displayed
      await passwordInput.fill('WrongPassword6')
      await Promise.all([
        recipientPage.waitForResponse(
          (r) => r.url().includes('/verify-password') && r.status() === 429,
          { timeout: 10_000 },
        ),
        unlockButton.click(),
      ])
      await expect(recipientPage.getByText(/too many attempts/i)).toBeVisible({ timeout: 5000 })

      // ── 3. CRITICAL: Navigate to Transfer B from the same browser/recipient session ──
      await recipientPage.goto(`${baseURL}/transfer/${shareHashB}`, { waitUntil: 'load' })
      await expect(recipientPage.getByRole('heading', { name: /protected transfer/i })).toBeVisible({
        timeout: 15_000,
      })

      // Ensure Transfer B is NOT locked out by filling the correct password
      const passwordInputB = recipientPage.locator('input[type="password"]')
      const unlockButtonB = recipientPage.getByRole('button', { name: /unlock transfer/i })

      await passwordInputB.fill('PasswordBeta123!')
      await Promise.all([
        recipientPage.waitForResponse(
          (r) => r.url().includes('/verify-password') && r.status() === 200,
          { timeout: 10_000 },
        ),
        unlockButtonB.click(),
      ])

      // Verify Transfer B unlocks and reveals transfer metadata
      await expect(recipientPage.getByRole('heading', { name: 'Secure_Asset_B.pdf' })).toBeVisible({
        timeout: 10_000,
      })
      await expect(recipientPage.getByRole('button', { name: /download/i })).toBeVisible()
    } finally {
      await recipientContext.close()

      // Cleanup test transfers
      if (transferA?.id || transferA?.doc?.id) {
        await page.request.delete(`${baseURL}/api/transfers/${transferA.id || transferA.doc.id}`)
      }
      if (transferB?.id || transferB?.doc?.id) {
        await page.request.delete(`${baseURL}/api/transfers/${transferB.id || transferB.doc.id}`)
      }
    }
  })
})
