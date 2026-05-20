import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { domainCategoryToMediaType, type DomainCategory } from '@/lib/storage-paths'

export async function POST(req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      filename,
      mimeType,
      filesize,
      storagePath,
      domainCategory,
      title,
      shootName,
      manualTags,
      location,
    } = body

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

    const mediaType = domainCategory
      ? domainCategoryToMediaType(domainCategory as DomainCategory)
      : 'image'

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
