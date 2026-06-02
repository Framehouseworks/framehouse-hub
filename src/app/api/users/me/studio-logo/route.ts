import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST — upload a studio logo for the authenticated user.
//
// Request contract (mirrors register-local to reuse the pipeline):
//   Content-Type: image/png | image/jpeg | image/svg+xml
//   X-Filename: logo.png
//   Body: raw file bytes
//
// Returns: { mediaId: number }
//
// Cloud-mode note: when GCS_BUCKET is set the writeOriginalToEnclave hook
// is a no-op and the file won't land in GCS. The full cloud logo flow
// (signed-url → GCS → register-gcs) is deferred to a follow-up ticket.
// For now, cloud-mode logo uploads are disabled with a 501 response.
export async function POST(req: Request): Promise<NextResponse> {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (process.env.GCS_BUCKET) {
    return NextResponse.json(
      { error: 'Cloud-mode studio logo upload is not yet supported.' },
      { status: 501 },
    )
  }

  const filename = req.headers.get('x-filename')
  if (!filename) {
    return NextResponse.json({ error: 'Missing X-Filename header' }, { status: 400 })
  }

  const mimeType = req.headers.get('content-type') ?? 'image/png'
  const allowedMime = ['image/png', 'image/jpeg', 'image/svg+xml']
  if (!allowedMime.includes(mimeType)) {
    return NextResponse.json({ error: 'Only PNG, JPEG, and SVG are allowed.' }, { status: 415 })
  }

  const buffer = Buffer.from(await req.arrayBuffer())
  if (buffer.length === 0) {
    return NextResponse.json({ error: 'Empty request body' }, { status: 400 })
  }

  const MAX_BYTES = 2 * 1024 * 1024 // 2 MB
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 2 MB limit' }, { status: 413 })
  }

  const baseName = filename.replace(/\.[^.]+$/, '')

  const mediaRecord = await payload.create({
    collection: 'media',
    data: {
      title: `Studio Logo — ${baseName}`,
      alt: 'Studio logo',
      mediaType: 'image',
      owner: user.id,
      shootName: '',
      manualTags: [],
      location: { address: '' },
    },
    file: {
      data: buffer,
      name: filename,
      mimetype: mimeType,
      size: buffer.length,
    },
  })

  return NextResponse.json({ mediaId: mediaRecord.id })
}
