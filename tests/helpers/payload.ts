import { getPayload, type Payload } from 'payload'
import config from '@/payload.config'

// Returns a Payload instance bound to the ephemeral DB provisioned by
// vitest.globalSetup.ts. Calls `getPayload` against the project's
// `payload.config` so collection definitions / hooks / access rules match
// what runs in dev and prod.
let cached: Payload | null = null

export async function getTestPayload(): Promise<Payload> {
  if (cached) return cached
  if (!process.env.DATABASE_URI) {
    throw new Error('DATABASE_URI not set — vitest.globalSetup.ts must run before tests')
  }
  const resolved = await config
  cached = await getPayload({ config: resolved })
  return cached
}
