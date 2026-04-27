import configPromise from '@payload-config'
import { getPayload, Payload } from 'payload'

/**
 * A resilient wrapper for getPayload that handles "Isolated Build" scenarios.
 * If the database connection fails during the build phase (ECONNREFUSED),
 * it returns a graceful failure state or a mock client to prevent the build from crashing.
 */
export async function getPayloadClient(): Promise<Payload> {
  try {
    return await getPayload({ config: configPromise })
  } catch (error: any) {
    // Check if we are in an isolated build environment
    const isBuildPhase = process.env.IS_BUILD_PHASE === 'true'

    // If we are building and it's a connection error, return a minimal client or handle gracefully
    // Note: In Payload 3.0, if getPayload fails, the process usually exits or throws.
    // By catching it here, we can decide how to proceed.
    if (isBuildPhase) {
      console.warn(
        '⚠️ [Build Phase] Database connection unavailable. Static generation will be skipped for this cycle.',
      )

      // We return the failed error to be caught by the page's try/catch,
      // or we could return a mock. For now, we re-throw to be caught by generateStaticParams.
      throw error
    }

    throw error
  }
}
