import { execSync } from 'node:child_process'

/**
 * Global setup runs once before all tests in the Playwright worker process.
 * Ensures database is seeded and ready for test execution.
 */
async function globalSetup() {
  try {
    console.log('🌱 Running database seed before E2E tests...')
    execSync('pnpm run seed', { stdio: 'inherit' })
    console.log('✓ Database seeding complete')
  } catch (err) {
    console.warn('⚠ Database seeding failed, tests may run with stale state:', err)
  }
}

export default globalSetup
