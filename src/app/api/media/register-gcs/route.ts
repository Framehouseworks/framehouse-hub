import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { filename, mimeType, filesize, storagePath, title, shootName, manualTags, location } =
      body

    if (!filename || !mimeType || !storagePath) {
      return NextResponse.json(
        { error: 'Missing required filename, mimeType, or storagePath' },
        { status: 400 },
      )
    }

    const bucketName = process.env.GCS_BUCKET
    if (!bucketName) {
      return NextResponse.json(
        { error: 'Cloud Storage is not configured on the server' },
        { status: 400 },
      )
    }

    // 2. Determine MediaType: Image or Raw based on common file extensions
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const isRaw = ['dng', 'arw', 'cr2', 'nef', 'orf', 'rw2', 'pef', 'raf'].includes(ext)
    const mediaType = isRaw ? 'raw' : 'image'

    // GCS Public / Authenticated URL builder
    const originalUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}`

    // 3. Create database record using Payload Local API
    // This bypasses file upload handlers and writes directly to PostgreSQL
    const mediaRecord = await payload.create({
      collection: 'media',
      data: {
        title: title || filename.split('.').slice(0, -1).join('.') || filename,
        alt: title || filename,
        filename,
        mimeType,
        filesize: Number(filesize) || 0,
        mediaType,
        ingestionStatus: 'processing', // Marked as processing for the Cloud Run worker
        owner: user.id,
        originalUrl,
        shootName: shootName || '',
        manualTags: manualTags || [],
        location: {
          address: location?.address || '',
        },
      },
      req, // Pass request context to maintain operation traceability
    })

    return NextResponse.json({
      success: true,
      media: mediaRecord,
    })
  } catch (error: unknown) {
    console.error('[register-gcs API Error]:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
