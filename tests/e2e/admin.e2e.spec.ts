import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard Smoke Gate', () => {
  const baseURL = 'http://localhost:3000'
  const adminEmail = 'sys.admin@framehouseworks.com'
  const adminPassword = 'password123'

  test.beforeAll(async ({ request }) => {
    // Attempt to seed the system admin user via API in case the database is completely fresh.
    // Wrap in a try-catch with failOnStatusCode: false to ensure maximum E2E environment resilience.
    try {
      await request.post(`${baseURL}/api/users`, {
        data: {
          email: adminEmail,
          password: adminPassword,
          name: 'System Admin',
        },
        failOnStatusCode: false,
      })
    } catch (err) {
      console.log('Failsafe user seeding skipped or already established:', err)
    }
  })

  test('should successfully load the Admin home page upon authenticating', async ({ page }) => {
    // Collect console errors to detect any runtime crash in the background
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 2. Navigate to admin login
    await page.goto(`${baseURL}/admin/login`)

    // 3. Fill details and submit
    await page.locator('input[name="email"]').fill(adminEmail)
    await page.locator('input[name="password"]').fill(adminPassword)
    await page.locator('button[type="submit"]').click()

    // 4. Bypasses credentials and reaches administrative dashboard
    await page.waitForURL(/\/admin/)

    // 5. Assert the admin dashboard has resolved successfully by checking layout container visibility.
    // Hardened with a 10s timeout to allow smooth hydration on slower CI pipelines.
    await expect(page.locator('nav[class*="nav"]').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 })

    // 6. Ensure no query or database crashes occurred, ignoring generic browser warnings or missing asset 404s
    const queryErrors = consoleErrors.filter(
      (err) =>
        err.includes('Failed query') ||
        (err.includes('does not exist') && err.includes('column')) ||
        err.includes('relation') ||
        err.includes('table'),
    )
    expect(queryErrors).toEqual([])
  })

  test('should satisfy mobile accessibility reflow criteria', async ({ page }) => {
    // 1. Sign in as admin
    await page.goto(`${baseURL}/admin/login`)
    await page.locator('input[name="email"]').fill(adminEmail)
    await page.locator('input[name="password"]').fill(adminPassword)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL(/\/admin/)

    // 2. Resize viewport to compact mobile screen width
    await page.setViewportSize({ width: 375, height: 667 })

    // 3. Assert navigation sidebar collapses into a hamburger trigger button that is visible on mobile.
    // Hardened with a 10s timeout to handle responsive styling recalculation delays on slower CI runners.
    const menuToggler = page.locator('button[class*="nav-toggler"]:visible').first()
    await expect(menuToggler).toBeVisible({ timeout: 10000 })

    // 4. Verify touch trigger exists and is active with positive dimensions inside the layout
    const boundingBox = await menuToggler.boundingBox()
    expect(boundingBox).not.toBeNull()
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(0)
      expect(boundingBox.height).toBeGreaterThan(0)
    }
  })
})
