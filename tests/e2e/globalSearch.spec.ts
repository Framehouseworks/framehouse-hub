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
    // /dashboard/library holds an open SSE connection (/api/media/status-stream)
    // so waitUntil: 'networkidle' is never satisfied — use explicit element wait.
    await expect(page.locator('header input[type="text"]')).toBeVisible()
  })

  test('/ key focuses the search input', async ({ page }) => {
    // CI headless Chromium does not give the document focus after navigation.
    // window.addEventListener('keydown') only fires if the document is the active
    // focus target. Clicking body (not the input) engages focus without activating
    // any interactive element, so the '/' shortcut guard (tag !== INPUT) still fires.
    await page.locator('body').click()
    await page.keyboard.press('/')
    const input = page.locator('header input[type="text"]')
    await expect(input).toBeFocused()
  })

  // Meta+k is macOS-only; ControlOrMeta is cross-platform (Ctrl on Linux CI,
  // Cmd on macOS) and requires Playwright ≥ 1.43 (project uses 1.56.1).
  test('Cmd+K / Ctrl+K focuses the search input', async ({ page }) => {
    // Same focus requirement as '/' shortcut — see comment above.
    await page.locator('body').click()
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

  test('Enter routes to /dashboard/library?search=<query>', async ({ page }) => {
    const input = page.locator('header input[type="text"]')
    // pressSequentially triggers per-keystroke React synthetic events — consistent
    // with other search tests and guards against any React batching edge cases.
    await input.click()
    await input.pressSequentially('iceland')
    await input.press('Enter')
    await expect(page).toHaveURL(/\/dashboard\/library\?search=iceland/)
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
