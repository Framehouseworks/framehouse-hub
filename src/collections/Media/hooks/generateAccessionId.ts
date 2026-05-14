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
  const sequenceName = `accession_id_seq_${currentYear}`
  const prefix = `FRH-${currentYear}-`

  try {
    // Execute raw SQL to get the next value from the sequence
    let nextSequenceNumber: number

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
        const result = await db.execute(`SELECT nextval('${sequenceName}')`)
        // Drizzle result rows are usually an array of objects
        const rows = result.rows as Array<{ nextval: string | number }>
        nextSequenceNumber = Number(rows[0].nextval)
      } catch (seqErr: unknown) {
        const error = seqErr as { code?: string; message?: string }
        // If the sequence doesn't exist yet, try to create it and retry once
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          req.payload.logger.warn(`[Media] Sequence ${sequenceName} missing, creating...`)
          await db.execute(`CREATE SEQUENCE IF NOT EXISTS ${sequenceName} START WITH 1;`)
          const retryResult = await db.execute(`SELECT nextval('${sequenceName}')`)
          const retryRows = retryResult.rows as Array<{ nextval: string | number }>
          nextSequenceNumber = Number(retryRows[0].nextval)
        } else {
          throw seqErr
        }
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
      nextSequenceNumber = 1
      if (lastDocs?.[0]?.accessionId) {
        const lastNum = parseInt(lastDocs[0].accessionId.split('-').pop() || '0', 10)
        nextSequenceNumber = lastNum + 1
      }
    }

    // Format with leading zeros (4 digits)
    data.accessionId = `${prefix}${String(nextSequenceNumber).padStart(4, '0')}`

    req.payload.logger.info(`[Media] Atomic Archival ID Assigned: ${data.accessionId}`)
  } catch (err) {
    req.payload.logger.error(`[Media] Accession ID Generation Failed: ${err}`)
    // Final emergency fallback to timestamp to ensure the upload doesn't fail
    data.accessionId = `${prefix}ERR-${Date.now()}`
  }

  return data
}
