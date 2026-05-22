import { test, expect } from '@playwright/test'

const baseURL = 'http://localhost:3000'
const email = 'creative@framehouseworks.com'
const password = 'password123'

test.describe('Global Search (FRH-44)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' })
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await Promise.all([
      page.waitForURL('**/dashboard**'),
      page.locator('button[type="submit"]').click(),
    ])
  })

  test('/ key focuses the search input', async ({ page }) => {
    await page.keyboard.press('/')
    const input = page.locator('header input[type="text"]')
    await expect(input).toBeFocused()
  })

  test('Cmd+K focuses the search input', async ({ page }) => {
    await page.keyboard.press('Meta+k')
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

  test('search input stays pre-filled on /dashboard after navigation', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard?search=canyon`, { waitUntil: 'networkidle' })
    const input = page.locator('header input[type="text"]')
    await expect(input).toHaveValue('canyon')
  })

  test('searching from another dashboard route redirects to /dashboard', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard/collections`, { waitUntil: 'networkidle' })
    const input = page.locator('header input[type="text"]')
    await input.fill('portrait')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/dashboard\?search=portrait/)
  })
})
