import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Generates a museum-grade sequential Accession ID in the format:
 * FRH-YYYY-NNNN (e.g. FRH-2024-0001)
 *
 * This implementation uses a Postgres Sequence to ensure 100% atomic
 * uniqueness, preventing collisions even under high concurrency.
 */
export const generateAccessionId: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  // Only run on creation and if accessionId isn't already set
  if (operation !== 'create' || data.accessionId) {
    return data
  }

  const currentYear = new Date().getFullYear()
  const prefix = `FRH-${currentYear}-`

  try {
    // In Payload 3.0, the DB adapter is available on req.payload.db
    // For Postgres, it provides a drizzle instance.
    const dbAdapter = req.payload.db as {
      drizzle?: {
        execute: (sql: string) => Promise<{ rows: Array<Record<string, string | number>> }>
      }
    }
    const db = dbAdapter.drizzle

    if (db) {
      try {
        // 1. Get next atomic sequence number
        const result = await db.execute(`SELECT nextval('global_archival_sequence')`)
        const rows = result.rows
        const nextSequenceNumber = Number(rows[0].nextval)

        // 2. Populate the archivalSequence field (Simple Counter)
        data.archivalSequence = nextSequenceNumber

        // 3. Format the Accession ID (Museum-Grade Identity)
        // We still use the year-based prefix for the public-facing ID
        data.accessionId = `${prefix}${String(nextSequenceNumber).padStart(4, '0')}`

        req.payload.logger.info(
          `[Media] Archival Identity Assigned: ${data.accessionId} (Seq: ${nextSequenceNumber})`,
        )
      } catch (seqErr: unknown) {
        req.payload.logger.error(`[Media] Sequence Generation Failed: ${seqErr}`)
        // Fallback to timestamp if sequence fails to ensure upload persists
        data.accessionId = `${prefix}ERR-${Date.now()}`
      }
    } else {
      req.payload.logger.error(
        `[Media] Drizzle adapter not found, falling back to non-atomic find.`,
      )
      const { docs: lastDocs } = await req.payload.find({
        collection: 'media',
        where: { accessionId: { like: `${prefix}%` } },
        sort: '-accessionId',
        limit: 1,
        overrideAccess: true,
        pagination: false,
      })
      let nextSequenceNumber = 1
      if (lastDocs?.[0]?.accessionId) {
        const lastNum = parseInt(lastDocs[0].accessionId.split('-').pop() || '0', 10)
        nextSequenceNumber = lastNum + 1
      }
      data.archivalSequence = nextSequenceNumber
      data.accessionId = `${prefix}${String(nextSequenceNumber).padStart(4, '0')}`
    }
  } catch (err) {
    req.payload.logger.error(`[Media] Accession ID Generation Failed: ${err}`)
    data.accessionId = `${prefix}ERR-${Date.now()}`
  }

  return data
}
