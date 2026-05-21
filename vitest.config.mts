import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Default to node — int tests use fs/crypto/payload local API.
    // Component tests can opt back into jsdom via `// @vitest-environment jsdom`.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    globalSetup: ['./vitest.globalSetup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    // Give pg + payload init headroom.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
