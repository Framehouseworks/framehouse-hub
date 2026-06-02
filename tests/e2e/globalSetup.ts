import { execSync } from 'node:child_process'

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

/**
 * Global setup runs once before all tests in the Playwright worker process.
 * Ensures database is seeded and ready for test execution.
 *
 * In dev mode, also pre-warms key pages so the first test doesn't time out
 * waiting for Next.js JIT compilation.
 */
async function globalSetup() {
  // Apply any pending migrations before seeding so the schema is always current.
  // This is idempotent (no-op when already up to date) and handles the common
  // case where new migrations were added after the developer last migrated locally.
  try {
    console.log('⚙ Applying pending migrations...')
    execSync('pnpm run payload migrate', { stdio: 'inherit' })
    console.log('✓ Migrations up to date')
  } catch (err) {
    console.warn('⚠ Migration step failed — tests may fail if schema is out of date:', err)
  }

  try {
    console.log('🌱 Running database seed before E2E tests...')
    execSync('pnpm run seed', { stdio: 'inherit' })
    console.log('✓ Database seeding complete')
  } catch (err) {
    console.warn('⚠ Database seeding failed, tests may run with stale state:', err)
  }

  // Pre-warm pages that take a long time to JIT-compile on first request in dev
  // mode. In production (CI) these are already compiled — this is a no-op then.
  try {
    const warmUp = ['/login', '/admin/login', '/dashboard/library']
    await Promise.all(
      warmUp.map((path) =>
        fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(25_000) }).catch(() => {}),
      ),
    )
    console.log('✓ Server pre-warm complete')
  } catch {
    // Non-fatal — tests will retry on first-run JIT delays
  }
}

export default globalSetup
