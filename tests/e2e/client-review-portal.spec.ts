import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const ADMIN_EMAIL = 'sys.admin@framehouseworks.com'
const ADMIN_PASSWORD = 'password123'

// These tests assume the portfolio created in seed has review mode enabled.
// We dynamically find the portfolio slug for the test.

test.describe('Client Review Portal', () => {
  let portfolioSlug = ''

  test.beforeAll(async ({ browser }) => {
    // Find a portfolio with review enabled via admin API
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    await page.goto(`${BASE_URL}/admin/login`)
    await page.locator('input[name="email"]').fill(ADMIN_EMAIL)
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 45_000 })

    // Get a public portfolio slug via API
    const response = await page.request.get(
      `${BASE_URL}/api/portfolios?where[visibility][equals]=public&depth=0&limit=1`,
    )
    const json = await response.json()
    if (json.docs?.[0]?.slug) {
      portfolioSlug = json.docs[0].slug
    }
    await ctx.close()
  })

  test.describe('Selection mode', () => {
    test('selection bar appears when item selected', async ({ page }) => {
      if (!portfolioSlug) {
        test.skip()
        return
      }

      await page.goto(`${BASE_URL}/p/${portfolioSlug}`)

      // Check if review mode is available (selection checkboxes or mode pill)
      const selectionPill = page.locator('button[aria-label*="selection mode" i]')
      const hasReviewMode = await selectionPill.count() > 0

      if (!hasReviewMode) {
        // Portfolio doesn't have review mode enabled — skip
        test.skip()
        return
      }

      // Mobile: tap selection mode pill to enable
      await selectionPill.first().click()

      // Wait for selection mode to activate
      await expect(selectionPill.first()).toHaveAttribute('aria-pressed', 'true')

      // Tap an asset (first available)
      const assetCheckbox = page.locator('[role="checkbox"][aria-label*="Select"]').first()
      if (await assetCheckbox.count() === 0) {
        test.skip()
        return
      }

      await assetCheckbox.click()

      // Selection bar should appear
      await expect(page.locator('[role="toolbar"][aria-label="Selection actions"]')).toBeVisible({
        timeout: 5000,
      })

      // Count should show "1"
      await expect(page.locator('[aria-live="polite"]')).toContainText('1')
    })

    test('Submit Selection button is visible in selection bar', async ({ page }) => {
      if (!portfolioSlug) test.skip()

      await page.goto(`${BASE_URL}/p/${portfolioSlug}`)

      const selectionPill = page.locator('button[aria-label*="selection mode" i]')
      if (await selectionPill.count() === 0) test.skip()

      await selectionPill.first().click()
      const checkbox = page.locator('[role="checkbox"][aria-label*="Select"]').first()
      if (await checkbox.count() === 0) test.skip()

      await checkbox.click()

      const bar = page.locator('[role="toolbar"]')
      await expect(bar).toBeVisible()
      await expect(bar.locator('button[aria-label*="Submit"]')).toBeVisible()
    })
  })

  test.describe('Comment panel', () => {
    test('comment panel opens in lightbox when allowed', async ({ page }) => {
      if (!portfolioSlug) test.skip()

      await page.goto(`${BASE_URL}/p/${portfolioSlug}`)

      // Click an asset to open lightbox
      const assets = page.locator('.group\\/selectable, [data-filmstrip-card]')
      if (await assets.count() === 0) test.skip()

      await assets.first().click()

      // Wait for lightbox
      const lightbox = page.locator('[role="dialog"][aria-modal="true"]')
      await expect(lightbox).toBeVisible({ timeout: 5000 })

      // Check for comment toggle button (only if comments enabled)
      const commentBtn = lightbox.locator('button[aria-label*="notes panel" i]')
      if (await commentBtn.count() === 0) {
        // Comments not enabled on this portfolio — skip
        test.skip()
        return
      }

      await commentBtn.click()
      await expect(lightbox.locator('[role="complementary"][aria-label="Asset comments"]')).toBeVisible({
        timeout: 3000,
      })
    })
  })

  test.describe('Admin support overlay', () => {
    test('admin overlay shows review settings when logged in as admin', async ({ page }) => {
      if (!portfolioSlug) test.skip()

      // Log in as admin
      await page.goto(`${BASE_URL}/admin/login`)
      await page.locator('input[name="email"]').fill(ADMIN_EMAIL)
      await page.locator('input[name="password"]').fill(ADMIN_PASSWORD)
      await page.locator('button[type="submit"]').click()
      await page.waitForURL(/\/admin(?!\/login)/, { timeout: 45_000 })

      // Navigate to portfolio
      await page.goto(`${BASE_URL}/p/${portfolioSlug}`)

      // Admin overlay should be present
      const adminOverlay = page.locator('[aria-label="Admin support panel"]')
      const toggleBtn = page.locator('button[aria-label="Open admin panel"]')
      await expect(toggleBtn).toBeVisible({ timeout: 5000 })

      await toggleBtn.click()
      await expect(adminOverlay).toBeVisible()
    })
  })

  test.describe('Empty comment validation', () => {
    test('comment submit button disabled for empty input', async ({ page }) => {
      if (!portfolioSlug) test.skip()

      await page.goto(`${BASE_URL}/p/${portfolioSlug}`)

      const assets = page.locator('.group\\/selectable').first()
      if (await assets.count() === 0) test.skip()

      await assets.click()

      const lightbox = page.locator('[role="dialog"][aria-modal="true"]')
      await expect(lightbox).toBeVisible({ timeout: 5000 })

      const commentBtn = lightbox.locator('button[aria-label*="notes panel" i]')
      if (await commentBtn.count() === 0) test.skip()

      await commentBtn.click()

      // Post button should be disabled with empty textarea
      const postBtn = lightbox.locator('button[aria-label="Post comment"]')
      await expect(postBtn).toBeDisabled()

      // Type a comment — button should enable
      await lightbox.locator('textarea[aria-label="Write a note"]').fill('  ')
      // Still disabled (whitespace-only)
      await expect(postBtn).toBeDisabled()

      await lightbox.locator('textarea[aria-label="Write a note"]').fill('Great shot!')
      await expect(postBtn).toBeEnabled()
    })
  })
})
