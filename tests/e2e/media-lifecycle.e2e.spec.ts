import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const baseURL = 'http://localhost:3000'
const creativeEmail = 'creative@framehouseworks.com'
const creativePassword = 'password123'
const SOURCE_FIXTURE = path.resolve(__dirname, '../../src/seed/fixtures/alpine-summit-01.jpg')

// Reaches the worker via the Go binary auto-launched by pnpm dev (scripts/dev-with-worker.sh).
// In CI, playwright.config.ts auto-spawns the dev server which includes the worker.
// Locally, run `pnpm dev` in a separate terminal before invoking this spec.
test.describe('Media lifecycle (e2e)', () => {
  test.beforeAll(() => {
    // Self-heal: ensure the creative user + fixture media are seeded so the
    // gallery has a known starting state. The seed's reconcile path is a
    // no-op if everything is already in place.
    try {
      execSync('pnpm run seed', { stdio: 'inherit' })
    } catch (err) {
      console.warn('Seed step skipped:', err)
    }
  })

  test('uploads, processes, renders thumbnail, then bulk-deletes', async ({ page }) => {
    // Make the upload identifiable across reloads by copying the fixture
    // to a unique filename. MediaCard renders `alt={media.alt || filename}`,
    // so the unique name becomes our needle.
    const uniqueName = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const stagedFixture = path.join(os.tmpdir(), uniqueName)
    fs.copyFileSync(SOURCE_FIXTURE, stagedFixture)

    try {
      // 1. Sign in. Drive the form via fill + button click but also wait
      // for the /api/users/login POST so react-hook-form's onSubmit has
      // actually fired before we expect navigation.
      await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })
      await page.locator('input[name="email"]').fill(creativeEmail)
      await page.locator('input[name="password"]').fill(creativePassword)
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/api/users/login') && r.request().method() === 'POST',
          { timeout: 30_000 },
        ),
        page.getByRole('button', { name: /continue/i }).click(),
      ])
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 })

      // 2. Trigger the upload picker, populate the hidden input.
      await page.locator('button:has-text("Ingest New Work")').first().click()
      await page.locator('input[type="file"]').setInputFiles(stagedFixture)

      // 3. IngestionWorkbench → commit.
      await page.locator('button:has-text("Start Archival Ingest")').click()

      // 4. Worker callback finishes the asset. Pipeline:
      //    register-local → writeOriginalToEnclave → triggerLocalWorker →
      //    Go worker derivatives → process-callback → SSE/poll → UI.
      await expect(page.locator('text=Archival Complete')).toBeVisible({ timeout: 60_000 })

      // 5. After reload the new card must render with the canonical
      //    derivative URL — proves thumbnailUrl was stamped on the doc.
      await page.reload()
      const newCard = page.locator(`main img[alt="${uniqueName}"]`)
      await expect(newCard).toBeVisible({ timeout: 30_000 })
      const src = await newCard.getAttribute('src')
      expect(src).toMatch(/\/media\/tenants\/.+\/derivatives\/.+\.webp/)

      // 6. Enter selection mode, pick the new card, hit bulk Delete. The
      // selection-mode overlay (z-30) intercepts pointer events on the
      // motion.div parent, so click the overlay itself with `force: true`
      // to ensure the synthetic event reaches the card's onClick.
      await page.locator('button:has-text("Select")').first().click()
      await newCard.locator('..').click({ force: true })
      await page.locator('button:has-text("Delete")').first().click()

      // 7. SafetyLockDeleteModal — type DELETE to authorise.
      await page.locator('input[placeholder="INTENT"]').fill('DELETE')
      await page.locator('button:has-text("Authorize Disposal")').click()

      // 8. Card disappears from the grid.
      await expect(newCard).toHaveCount(0, { timeout: 30_000 })
    } finally {
      try {
        fs.unlinkSync(stagedFixture)
      } catch {
        /* best-effort cleanup */
      }
    }
  })
})
