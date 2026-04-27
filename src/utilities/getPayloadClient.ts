import configPromise from '@payload-config'
import { getPayload, Payload } from 'payload'

/**
 * A resilient wrapper for getPayload that handles "Isolated Build" scenarios.
 * Returns null if the database is unavailable during the build phase.
 */
export async function getPayloadClient(): Promise<Payload | null> {
  // Check if we are in an isolated build environment
  const isBuildPhase = process.env.IS_BUILD_PHASE === 'true'

  if (isBuildPhase) {
    console.warn('⚠️ [Build Phase] Skipping database connection to ensure isolated compilation.')
    return null
  }

  try {
    return await getPayload({ config: configPromise })
  } catch (error: unknown) {
    console.error('❌ Failed to connect to Payload:', error)
    throw error
  }
}
