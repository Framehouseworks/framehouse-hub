import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { buildStoragePath, classifyDomainCategory } from '@/lib/storage-paths'

export async function POST(req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { mediaId } = body

    if (!mediaId) {
      return NextResponse.json({ error: 'Missing mediaId' }, { status: 400 })
    }

    const mediaDoc = await payload.findByID({ collection: 'media', id: mediaId })
    if (!mediaDoc) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    const ownerId = typeof mediaDoc.owner === 'object' ? mediaDoc.owner?.id : mediaDoc.owner
    if (String(ownerId) !== String(user.id)) {
      return NextResponse.json({ error: 'Not authorized to reprocess this asset' }, { status: 403 })
    }

    await payload.update({
      collection: 'media',
      id: mediaId,
      data: {
        ingestionStatus: 'processing',
        processingStep: 'upload_complete',
        errorMessage: '',
      },
    })

    const filename = mediaDoc.filename || ''
    const mimeType = mediaDoc.mimeType || ''
    const now = new Date(mediaDoc.createdAt)
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const domainCategory = classifyDomainCategory(mimeType, filename)

    const storagePath =
      mediaDoc.storagePath ||
      buildStoragePath({
        userId: String(ownerId),
        domainCategory,
        year,
        month,
        assetId: String(mediaId),
        filename,
      })

    const isCloudMode = !!process.env.GCS_BUCKET
    if (!isCloudMode) {
      const workerUrl = process.env.LOCAL_WORKER_URL || 'http://localhost:8080'
      fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: 'local', name: storagePath }),
      }).catch((err) => {
        payload.logger.error(`[Reprocess] Failed to contact Go worker: ${err}`)
      })
    }

    return NextResponse.json({ success: true, mediaId })
  } catch (error: unknown) {
    console.error('[reprocess API Error]:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
