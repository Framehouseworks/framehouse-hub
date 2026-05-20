import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { classifyDomainCategory, domainCategoryToMediaType } from '@/lib/storage-paths'

// Local-mode mirror of /api/media/register-gcs. The client uploads via
// multipart; we parse it here, then hand the buffer to payload.create via
// its `file` argument. The writeOriginalToEnclave beforeChange hook owns
// the disk write to the tenant enclave and stamps storagePath/originalUrl
// on the doc, so we get a single code path for hook-driven persistence
// (admin upload, dashboard upload, and seed all flow through the same
// place).
//
// We can't bypass Payload's generateFileData by stamping storagePath
// ourselves and skipping `file:` — generateFileData throws MissingFile on
// upload collections that have `filesRequiredOnCreate !== false`.
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

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file in multipart payload' }, { status: 400 })
    }

    let meta: {
      title?: string
      shootName?: string
      manualTags?: { tag: string }[]
      location?: { address?: string }
    } = {}
    const metaRaw = form.get('_payload')
    if (typeof metaRaw === 'string') {
      try {
        meta = JSON.parse(metaRaw)
      } catch {
        // ignore malformed metadata
      }
    }

    const mimeType = file.type || 'application/octet-stream'
    const filename = file.name
    const buffer = Buffer.from(await file.arrayBuffer())
    const domainCategory = classifyDomainCategory(mimeType, filename)

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
