/**
 * POST /api/admin/media/force-fail
 *
 * Admin-only endpoint to force-fail media docs that are stuck in 'processing'
 * state (e.g. from corrupt uploads where the worker timed out without sending
 * a callback). Cleans up storage artifacts and marks the DB record as 'failed'.
 *
 * Body: { olderThanMinutes?: number }  — default 10, min 1
 * Returns: { count: number; ids: string[] }
 */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { checkRole } from '@/access/utilities'
import { cleanupFailedStorage } from '@/lib/cleanup-failed-storage'

export async function POST(req: Request) {
  try {
    const headerStore = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers: headerStore })

    if (!user || !checkRole(['admin'], user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const olderThanMinutes = Math.max(1, Number(body.olderThanMinutes) || 10)
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString()

    // Find all docs stuck in 'processing' older than the cutoff
    const { docs } = await payload.find({
      collection: 'media',
      where: {
        and: [{ ingestionStatus: { equals: 'processing' } }, { createdAt: { less_than: cutoff } }],
      },
      limit: 100,
      depth: 0,
    })

    if (docs.length === 0) {
      return NextResponse.json({ count: 0, ids: [] })
    }

    const failedIds: string[] = []

    for (const doc of docs) {
      try {
        await payload.update({
          collection: 'media',
          id: doc.id,
          data: {
            ingestionStatus: 'failed',
            processingStep: 'failed',
            errorMessage: `Force-failed by admin after ${olderThanMinutes}min stuck in processing`,
            processedAt: new Date().toISOString(),
          },
        })

        if (doc.storagePath) {
          await cleanupFailedStorage(doc.storagePath, payload.logger as unknown as Console)
        }

        failedIds.push(String(doc.id))
      } catch (err) {
        payload.logger.error(
          `[force-fail] Failed to process doc ${doc.id}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    payload.logger.info(`[force-fail] Force-failed ${failedIds.length} stuck media docs`)

    return NextResponse.json({ count: failedIds.length, ids: failedIds })
  } catch (error: unknown) {
    console.error('[force-fail API Error]:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
