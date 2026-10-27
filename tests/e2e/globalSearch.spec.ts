import { test, expect } from '@playwright/test'

const baseURL = 'http://localhost:3000'
const email = 'creative@framehouseworks.com'
const password = 'password123'

test.describe('Global Search (FRH-44)', () => {
  test.beforeEach(async ({ page }) => {
    // Login via REST API directly — avoids the race where waitForResponse
    // times out because an existing session cookie causes an immediate redirect
    // before the form submit fires the /api/users/login request.
    const res = await page.request.post(`${baseURL}/api/users/login`, {
      data: { email, password },
    })
    expect(res.ok()).toBe(true)

    // Navigate to the dashboard after the session cookie is set by the API response.
    await page.goto(`${baseURL}/dashboard/library`, { waitUntil: 'load' })
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 25_000 })
    // Wait for the header search input to be present before each test.
    await expect(page.locator('header input[type="text"]')).toBeVisible()
  })


  test('/ key focuses the search input', async ({ page }) => {
    // CI headless Chromium does not give the document focus after navigation.
    // Click 'main' (the page content area) rather than 'body' to avoid
    // accidentally clicking header interactive elements like the UserDropdown.
    await page.locator('main').click()
    await page.evaluate(() => document.body.focus())
    await page.keyboard.press('/')
    const input = page.locator('header input[type="text"]')
    await expect(input).toBeFocused({ timeout: 5_000 })
  })

  // Meta+k is macOS-only; ControlOrMeta is cross-platform (Ctrl on Linux CI,
  // Cmd on macOS) and requires Playwright ≥ 1.43 (project uses 1.56.1).
  test('Cmd+K / Ctrl+K focuses the search input', async ({ page }) => {
    // Same focus requirement as '/' shortcut — see comment above.
    await page.locator('main').click()
    await page.evaluate(() => document.body.focus())
    await page.keyboard.press('ControlOrMeta+k')
    const input = page.locator('header input[type="text"]')
    await expect(input).toBeFocused({ timeout: 5_000 })
  })

  test('focusing input shows suggestion dropdown with quick filters', async ({ page }) => {
    await page.locator('header input[type="text"]').click()
    for (const chip of ['RAW', 'Video', 'Drone', 'Portrait']) {
      await expect(page.locator(`button:has-text("${chip}")`).first()).toBeVisible()
    }
  })

  test('Enter routes to /dashboard/library?search=<query>', async ({ page }) => {
    const input = page.locator('header input[type="text"]')
    // pressSequentially triggers per-keystroke React synthetic events — consistent
    // with other search tests and guards against any React batching edge cases.
    await input.click()
    await input.pressSequentially('iceland')
    await input.press('Enter')
    // waitForURL is more resilient than toHaveURL for async router.push transitions.
    await page.waitForURL(/\/dashboard\/library\?search=iceland/, { timeout: 15_000 })
  })

  test('clicking quick filter chip sets ?search= and navigates to /dashboard/library', async ({
    page,
  }) => {
    await page.locator('header input[type="text"]').click()
    // Ensure the dropdown has rendered before attempting the chip click.
    // input.click() triggers onFocus → setShowDropdown(true) → React re-render;
    // in a production build the button may not be in the DOM when Promise.all starts.
    const rawChip = page.locator('button:has-text("RAW")').first()
    await expect(rawChip).toBeVisible()
    await Promise.all([
      page.waitForURL('**/dashboard/library?search=raw**'),
      rawChip.click(),
    ])
    await expect(page).toHaveURL(/\/dashboard\/library\?search=raw/)
  })

  // Use 'load' (not 'networkidle') — /dashboard/library holds a persistent SSE
  // connection that prevents networkidle from ever firing in CI.
  // /dashboard?search=canyon redirects (server-side) to /dashboard/library?search=canyon,
  // preserving the search param so the header input stays pre-filled.
  test('search input stays pre-filled after navigation with search param', async ({ page }) => {
    await page.goto(`${baseURL}/dashboard?search=canyon`, { waitUntil: 'load' })
    const input = page.locator('header input[type="text"]')
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('canyon')
  })

  // /dashboard/collections does not exist; /account shares DashboardLayout
  // (same header search input) and is a real authenticated route.
  // pressSequentially types char-by-char, triggering per-keystroke React synthetic
  // events — eliminates any residual state batching race on the Enter handler.
  // The component fix (e.currentTarget.value in handleKeyDown) is the primary guard;
  // pressSequentially is belt-and-suspenders for CI robustness.
  test('searching from another dashboard route redirects to /dashboard/library', async ({
    page,
  }) => {
    await page.goto(`${baseURL}/account`, { waitUntil: 'load' })
    const input = page.locator('header input[type="text"]')
    await expect(input).toBeVisible()
    await input.click()
    await input.pressSequentially('portrait')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/dashboard\/library\?search=portrait/)
  })
})
