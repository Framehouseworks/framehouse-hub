import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import {
  classifyDomainCategory,
  domainCategoryToMediaType,
  enforceUploadSizeLimit,
  UploadSizeLimitError,
} from '@/lib/storage-paths'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Local-mode upload endpoint. Cloud-mode equivalent: signed-url +
// register-gcs. The client sends the raw file bytes as the body, with
// the filename + metadata in custom headers — multipart is intentionally
// avoided because Node 22 + Next 15 dev's `req.formData()` is unreliable
// in CI (intermittent "Failed to parse body as FormData") and adds
// nothing this route needs.
//
// Request contract:
//   POST /api/media/register-local
//   Content-Type: <file mime>
//   X-Filename: <original filename>
//   X-Upload-Meta: base64(JSON: {title?, shootName?, manualTags?, location?})
//   body: raw file bytes
//
// The writeOriginalToEnclave beforeChange hook still owns the disk
// write and stamps storagePath/originalUrl, so this route is a thin
// wrapper around payload.create with no special filesystem knowledge.
export async function POST(req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (process.env.GCS_BUCKET) {
      return NextResponse.json(
        { error: 'register-local is only valid when GCS_BUCKET is unset' },
        { status: 400 },
      )
    }

    const filename = req.headers.get('x-filename')
    if (!filename) {
      return NextResponse.json({ error: 'Missing X-Filename header' }, { status: 400 })
    }
    const mimeType = req.headers.get('content-type') || 'application/octet-stream'

    let meta: {
      title?: string
      shootName?: string
      manualTags?: { tag: string }[]
      location?: { address?: string }
      uploadBatchId?: number | string
    } = {}
    const metaRaw = req.headers.get('x-upload-meta')
    if (metaRaw) {
      try {
        meta = JSON.parse(Buffer.from(metaRaw, 'base64').toString('utf-8'))
      } catch {
        // Ignore malformed metadata — treat as no metadata supplied.
      }
    }

    const buffer = Buffer.from(await req.arrayBuffer())
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 })
    }
    const domainCategory = classifyDomainCategory(mimeType, filename)
    try {
      enforceUploadSizeLimit(domainCategoryToMediaType(domainCategory), buffer.length)
    } catch (err) {
      if (err instanceof UploadSizeLimitError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      throw err
    }

    const mediaRecord = await payload.create({
      collection: 'media',
      data: {
        title: meta.title || filename.split('.').slice(0, -1).join('.') || filename,
        alt: meta.title || filename,
        mediaType: domainCategoryToMediaType(domainCategory),
        owner: user.id,
        shootName: meta.shootName || '',
        manualTags: meta.manualTags || [],
        location: { address: meta.location?.address || '' },
        ...(meta.uploadBatchId ? { uploadBatchId: Number(meta.uploadBatchId) } : {}),
      },
      file: {
        data: buffer,
        name: filename,
        mimetype: mimeType,
        size: buffer.length,
      },
    })

    return NextResponse.json({ success: true, media: mediaRecord })
  } catch (error: unknown) {
    console.error('[register-local API Error]:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
