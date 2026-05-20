import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import {
  classifyDomainCategory,
  domainCategoryToMediaType,
  parseStoragePath,
} from '@/lib/storage-paths'

// Records a Media doc for an object the client has just uploaded to GCS
// via a signed URL. The path itself was issued by /api/media/signed-url
// (server-side), so we don't move bytes here — but we *do* re-classify
// the mediaType from mimeType+filename, and validate that the embedded
// domain in the supplied storagePath matches the server-derived one.
// This closes a class of issues where a client could send a path
// generated for one classification but a body field claiming another,
// landing inconsistent metadata in the DB.
export async function POST(req: Request) {
  try {
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

    // The owner segment in the path must match the authenticated user.
    // Prevents a signed URL issued for one tenant being registered under
    // another tenant's doc (signed-url binds the path to the caller, but
    // we re-assert here so register-gcs is independently safe).
    const parsedPath = parseStoragePath(storagePath)
    if (!parsedPath) {
      return NextResponse.json(
        {
          error: 'Malformed storagePath; expected tenants/{userId}/{domain}/…/original/{filename}',
        },
        { status: 400 },
      )
    }
    if (parsedPath.segment !== 'original') {
      return NextResponse.json(
        { error: 'storagePath must reference the original segment, not derivatives' },
        { status: 400 },
      )
    }
    if (parsedPath.userId !== String(user.id)) {
      return NextResponse.json(
        { error: 'storagePath owner does not match authenticated user' },
        { status: 403 },
      )
    }

    // Server-side classification is authoritative. The path's embedded
    // domain (set by signed-url) must agree with this re-classification —
    // mismatch implies the file at the path is different from what the
    // client claims, or the client passed a fabricated path.
    const serverDomainCategory = classifyDomainCategory(mimeType, filename)
    if (parsedPath.domainCategory !== serverDomainCategory) {
      return NextResponse.json(
        {
          error: `storagePath domain (${parsedPath.domainCategory}) does not match server-derived domain (${serverDomainCategory}) for mimeType ${mimeType}`,
        },
        { status: 400 },
      )
    }

    const mediaType = domainCategoryToMediaType(serverDomainCategory)
    const originalUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}`

    const mediaRecord = await payload.create({
      collection: 'media',
      data: {
        title: title || filename.split('.').slice(0, -1).join('.') || filename,
        alt: title || filename,
        filename,
        mimeType,
        filesize: Number(filesize) || 0,
        mediaType,
        ingestionStatus: 'processing',
        processingStep: 'upload_complete',
        owner: user.id,
        originalUrl,
        storagePath,
        shootName: shootName || '',
        manualTags: manualTags || [],
        location: {
          address: location?.address || '',
        },
      },
      req,
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
