import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard Smoke Gate', () => {
  const baseURL = 'http://localhost:3000'
  const adminEmail = 'sys.admin@framehouseworks.com'
  const adminPassword = 'password123'

  test.beforeAll(async ({ request }) => {
    // Attempt to seed the system admin user via API in case the database is completely fresh.
    // If it already exists (seeded by the migration/seeding script), this call will safely return 400/422, which we ignore.
    await request.post(`${baseURL}/api/users`, {
      data: {
        email: adminEmail,
        password: adminPassword,
        name: 'System Admin',
      },
    })
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

    // 5. Assert the admin dashboard has resolved using robust, CSS-Modules-immune selectors
    await expect(page.locator('nav[class*="nav"]').first()).toBeVisible()
    await expect(page.getByText('Collections')).toBeVisible()

    // 6. Ensure no query crashes occurred
    expect(
      consoleErrors.filter((err) => err.includes('Failed query') || err.includes('does not exist')),
    ).toEqual([])
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

    // 3. Assert navigation sidebar collapses into a hamburger trigger button
    // Using accessible getByRole to satisfy Playwright's strict mode and avoid CSS Module clashes
    const menuToggler = page.getByRole('button', { name: 'Open Menu' }).first()
    await expect(menuToggler).toBeVisible()

    // 4. Verify touch target accessibility standards on toggle triggers (min 40px height/width)
    const boundingBox = await menuToggler.boundingBox()
    expect(boundingBox).not.toBeNull()
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThanOrEqual(40)
      expect(boundingBox.height).toBeGreaterThanOrEqual(40)
    }
  })
})
