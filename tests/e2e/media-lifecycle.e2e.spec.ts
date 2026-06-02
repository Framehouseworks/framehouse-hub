import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const baseURL = 'http://localhost:3000'
const creativeEmail = 'creative@framehouseworks.com'
const creativePassword = 'password123'
const FIXTURE_DIR = path.resolve(__dirname, '../../src/seed/fixtures')
const SOURCE_FIXTURE = path.join(FIXTURE_DIR, 'alpine-summit-01.jpg')
const PREBUILT_DERIVATIVES = path.join(FIXTURE_DIR, 'derivatives/alpine-summit-01')
const MEDIA_ROOT = path.resolve(__dirname, '../../public/media')
const CALLBACK_SECRET = process.env.PROCESSOR_CALLBACK_SECRET || 'fallback-dev-secret-key-9988'

// Stages the prebuilt fixture derivatives at the enclave path that
// matches the uploaded doc's storagePath, then POSTs process-callback to
// flip ingestionStatus → ready and stamp thumbnailUrl/proxyUrl. This
// removes the live Go worker from the e2e's dependency graph so CI
// doesn't have to compile Go, install cwebp, or wait on a network
// callback round-trip.
async function completeProcessing(doc: { id: number | string; storagePath: string }) {
  const enclaveOriginal = path.join(MEDIA_ROOT, doc.storagePath)
  const derivativeDir = path.join(path.dirname(path.dirname(enclaveOriginal)), 'derivatives')
  fs.mkdirSync(derivativeDir, { recursive: true })
  for (const size of ['small', 'medium'] as const) {
    fs.copyFileSync(
      path.join(PREBUILT_DERIVATIVES, `${size}.webp`),
      path.join(derivativeDir, `${size}.webp`),
    )
  }

  // storagePath shape: tenants/{userId}/{domain}/{year}/{month}/{uuid}/original/{file}
  const segments = doc.storagePath.split('/')
  const assetId = segments[5]
  const derivativeUrlBase = segments.slice(0, -2).join('/') + '/derivatives'

  const res = await fetch(`${baseURL}/api/media/process-callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-processor-secret': CALLBACK_SECRET,
    },
    body: JSON.stringify({
      assetId,
      status: 'ready',
      dimensions: { width: 1600, height: 1200 },
      thumbnails: {
        small: `/media/${derivativeUrlBase}/small.webp`,
        medium: `/media/${derivativeUrlBase}/medium.webp`,
      },
    }),
  })
  if (!res.ok) {
    throw new Error(`Synthetic process-callback failed: ${res.status} ${await res.text()}`)
  }
}

// Worker is NOT required in CI — DISABLE_WORKER=1 is set in the workflow and
// completeProcessing() synthesises the callback directly (no Go binary, no cwebp).
// Locally, run `pnpm dev` (which starts the Go worker) before invoking this spec.
// Database is seeded via tests/e2e/globalSetup.ts before any tests run.
test.describe('Media lifecycle (e2e)', () => {
  test('uploads, processes, renders thumbnail, then bulk-deletes', async ({ page }) => {
    // Multi-step test: login → upload → process → verify → delete — needs more than the default 30s.
    test.setTimeout(90_000)
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
      // 'load' waits for all scripts (React hydration) without hanging on
      // Next.js HMR websockets — works in both dev and production.
      await page.goto(`${baseURL}/login`, { waitUntil: 'load' })
      await page.locator('input[name="email"]').fill(creativeEmail)
      await page.locator('input[name="password"]').fill(creativePassword)
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/api/users/login') && r.request().method() === 'POST',
          { timeout: 25_000 },
        ),
        page.getByRole('button', { name: /continue/i }).click(),
      ])
      await page.waitForURL(/\/dashboard/, { timeout: 25_000 })

      // 2. Trigger the upload picker, populate the hidden input.
      await page.locator('button:has-text("Ingest")').first().click()
      await page.locator('input[type="file"]').setInputFiles(stagedFixture)

      // 3. IngestionWorkbench → pick session → commit.
      // The Upload button is disabled until a session is selected.
      // Wait for the session combobox to be visible (workbench rendered),
      // pick the first option, then wait for the button to enable and click.
      const ingestBtn = page.getByRole('button', { name: /^Upload \d+ File/i })
      const sessionInput = page.locator('input[aria-label="Session"]')
      await sessionInput.waitFor({ state: 'visible', timeout: 15_000 })
      await sessionInput.click()
      const firstSessionOption = page.locator('[role="listbox"] [role="option"]').first()
      await firstSessionOption.waitFor({ state: 'visible', timeout: 10_000 })
      await firstSessionOption.click()

      await expect(ingestBtn).toBeEnabled({ timeout: 10_000 })
      await ingestBtn.click()

      const newDoc = await page.evaluate(async (filename: string) => {
        for (let i = 0; i < 60; i++) {
          const res = await fetch(
            `/api/media?where[filename][equals]=${encodeURIComponent(filename)}&depth=0&limit=1`,
            { cache: 'no-store' },
          )
          if (res.ok) {
            const data = (await res.json()) as { docs?: { id: number; storagePath: string }[] }
            if (data.docs?.[0]?.storagePath) return data.docs[0]
          }
          await new Promise((r) => setTimeout(r, 500))
        }
        throw new Error(`Uploaded doc with filename '${filename}' did not appear in /api/media`)
      }, uniqueName)

      // 4. Synthesise the worker callback. This stages derivative bytes
      // on disk and stamps the doc with thumbnailUrl/proxyUrl, so the
      // gallery renders the same final state the Go worker would
      // produce — without making CI compile Go or shell to cwebp.
      await completeProcessing(newDoc)

      // 5. Confirm the doc is `ready` and has a thumbnailUrl via the API.
      // (We avoid asserting on the overlay's 'Archival Complete' header —
      // it requires every queue item to be done, and stale processing
      // docs from earlier failed runs hydrate into the queue.)
      await page.evaluate(async (mediaId: number) => {
        for (let i = 0; i < 30; i++) {
          const res = await fetch(`/api/media/${mediaId}`, { cache: 'no-store' })
          if (res.ok) {
            const doc = (await res.json()) as { ingestionStatus?: string; thumbnailUrl?: string }
            if (doc.ingestionStatus === 'ready' && doc.thumbnailUrl) return
          }
          await new Promise((r) => setTimeout(r, 500))
        }
        throw new Error(`Doc ${mediaId} never reached ingestionStatus=ready with thumbnailUrl`)
      }, newDoc.id)

      // 5. After reload the new card must render with the canonical
      //    derivative URL — proves thumbnailUrl was stamped on the doc.
      await page.reload()
      const newCard = page.locator(`main img[alt="${uniqueName}"]`)
      await expect(newCard).toBeVisible({ timeout: 60_000 })
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

      // 8. Wait for the server to actually delete the doc, then reload.
      // The Server Action calls revalidatePath('/dashboard') which only
      // schedules a re-render — the gallery DOM keeps the stale card
      // until the client refetches. Reload forces the new server-rendered
      // state, so the assertion isn't racing the revalidation.
      await page.evaluate(async (mediaId: number) => {
        for (let i = 0; i < 30; i++) {
          const res = await fetch(`/api/media/${mediaId}`, { cache: 'no-store' })
          if (res.status === 404) return
          await new Promise((r) => setTimeout(r, 500))
        }
        throw new Error(`Doc ${mediaId} was not deleted within 15s`)
      }, newDoc.id)
      await page.reload()
      await expect(newCard).toHaveCount(0, { timeout: 15_000 })
    } finally {
      try {
        fs.unlinkSync(stagedFixture)
      } catch {
        /* best-effort cleanup */
      }
    }
  })
})
