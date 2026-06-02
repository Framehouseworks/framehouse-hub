import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard Smoke Gate', () => {
  const baseURL = 'http://localhost:3000'
  const adminEmail = 'sys.admin@framehouseworks.com'
  const adminPassword = 'password123'

  // Database is seeded via tests/e2e/globalSetup.ts before any tests run.

  test('should successfully authenticate, load the Admin home page, and support mobile reflow', async ({
    page,
  }) => {
    // Collect console errors to detect any runtime crash in the background
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 1. Navigate to admin login
    await page.goto(`${baseURL}/admin/login`)

    // 2. Fill details and submit
    await page.locator('input[name="email"]').fill(adminEmail)
    await page.locator('input[name="password"]').fill(adminPassword)
    await page.locator('button[type="submit"]').click()

    // 3. Bypasses credentials and reaches administrative dashboard (excluding the login page itself)
    // Using negative lookahead to prevent matching '/admin/login'
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 45_000 })

    // 4. Assert the admin dashboard has resolved successfully by checking standard layout elements.
    // Using robust href selector to guarantee exact authentication detection independent of compiled CSS Module hashes.
    await expect(page.locator('a[href*="/admin/collections/users"]').first()).toBeVisible({
      timeout: 60000,
    })

    // 5. Ensure no query or database crashes occurred, ignoring generic browser warnings or missing asset 404s
    const queryErrors = consoleErrors.filter(
      (err) =>
        err.includes('Failed query') ||
        (err.includes('does not exist') && err.includes('column')) ||
        err.includes('relation') ||
        err.includes('table'),
    )
    expect(queryErrors).toEqual([])

    // 6. Test mobile reflow using the ALREADY AUTHENTICATED active page context
    // This completely bypasses slow, redundant authentication round-trips and prevents DB session deadlocks
    await page.setViewportSize({ width: 375, height: 667 })

    // 7. Assert navigation sidebar collapses into an active hamburger menu trigger button visible on mobile
    const menuToggler = page
      .locator('button[aria-label*="menu" i]:visible, button[class*="toggler"]:visible')
      .first()
    await expect(menuToggler).toBeVisible({ timeout: 60000 })

    // 8. Verify touch trigger exists and is active with positive dimensions inside the layout
    const boundingBox = await menuToggler.boundingBox()
    expect(boundingBox).not.toBeNull()
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(0)
      expect(boundingBox.height).toBeGreaterThan(0)
    }
  })
})
