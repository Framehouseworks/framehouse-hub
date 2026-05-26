import { test, expect } from '@playwright/test'

const baseURL = 'http://localhost:3000'
const email = 'creative@framehouseworks.com'
const password = 'password123'

test.describe('Global Search (FRH-44)', () => {
  test.beforeEach(async ({ page }) => {
    // /login has no persistent connections — networkidle is safe here
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await Promise.all([
      page.waitForURL('**/dashboard**'),
      page.locator('button[type="submit"]').click(),
    ])
    // Wait for the header search input to be present before each test.
    // /dashboard holds an open SSE connection (/api/media/status-stream)
    // so waitUntil: 'networkidle' is never satisfied — use explicit element wait.
    await expect(page.locator('header input[type="text"]')).toBeVisible()
  })

  test('/ key focuses the search input', async ({ page }) => {
    await page.keyboard.press('/')
    const input = page.locator('header input[type="text"]')
    await expect(input).toBeFocused()
  })

  // Meta+k is macOS-only; ControlOrMeta is cross-platform (Ctrl on Linux CI,
  // Cmd on macOS) and requires Playwright ≥ 1.43 (project uses 1.56.1).
  test('Cmd+K / Ctrl+K focuses the search input', async ({ page }) => {
    await page.keyboard.press('ControlOrMeta+k')
    const input = page.locator('header input[type="text"]')
    await expect(input).toBeFocused()
  })

  test('focusing input shows suggestion dropdown with quick filters', async ({ page }) => {
    await page.locator('header input[type="text"]').click()
    for (const chip of ['RAW', 'Video', 'Drone', 'Portrait']) {
      await expect(page.locator(`button:has-text("${chip}")`).first()).toBeVisible()
    }
  })

  test('Enter routes to /dashboard?search=<query>', async ({ page }) => {
    const input = page.locator('header input[type="text"]')
    await input.fill('iceland')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/dashboard\?search=iceland/)
  })

  test('clicking quick filter chip sets ?search= and navigates to /dashboard', async ({ page }) => {
    await page.locator('header input[type="text"]').click()
    await Promise.all([
      page.waitForURL('**/dashboard?search=raw**'),
      page.locator('button:has-text("RAW")').first().click(),
    ])
    await expect(page).toHaveURL(/\/dashboard\?search=raw/)
  })

  // Use 'load' (not 'networkidle') — /dashboard holds a persistent SSE
  // connection that prevents networkidle from ever firing in CI.
  test('search input stays pre-filled on /dashboard after navigation', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard?search=canyon`, { waitUntil: 'load' })
    const input = page.locator('header input[type="text"]')
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('canyon')
  })

  // /dashboard/collections does not exist; /account shares DashboardLayout
  // (same header search input) and is a real authenticated route.
  test('searching from another dashboard route redirects to /dashboard', async ({ page }) => {
    await page.goto(`${baseURL}/account`, { waitUntil: 'load' })
    const input = page.locator('header input[type="text"]')
    await expect(input).toBeVisible()
    await input.fill('portrait')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/dashboard\?search=portrait/)
  })
})
