import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import {
  buildStoragePath,
  classifyDomainCategory,
  domainCategoryToMediaType,
  enforceUploadSizeLimit,
  UploadSizeLimitError,
} from '@/lib/storage-paths'

export async function POST(req: Request) {
  try {
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { filename, mimeType, filesize } = body

    if (!filename || !mimeType) {
      return NextResponse.json({ error: 'Missing required filename or mimeType' }, { status: 400 })
    }

    // Pre-flight size enforcement. Run before any GCS work so an over-limit
    // client never gets a signed URL it could waste bandwidth filling.
    if (filesize != null) {
      const numericSize = Number(filesize)
      const domainForCheck = classifyDomainCategory(mimeType, filename)
      try {
        enforceUploadSizeLimit(domainCategoryToMediaType(domainForCheck), numericSize)
      } catch (err) {
        if (err instanceof UploadSizeLimitError) {
          return NextResponse.json({ error: err.message }, { status: err.status })
        }
        throw err
      }
    }

    const bucketName = process.env.GCS_BUCKET
    if (!bucketName) {
      return NextResponse.json({ localMode: true })
    }

    const crypto = await import('crypto')
    const assetId = crypto.randomUUID()
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const domainCategory = classifyDomainCategory(mimeType, filename)

    const storagePath = buildStoragePath({
      userId: String(user.id),
      domainCategory,
      year,
      month,
      assetId,
      filename,
    })

    const { Storage } = await import('@google-cloud/storage')
    let storageInstance

    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      try {
        const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
        storageInstance = new Storage({
          credentials,
          projectId: process.env.GCP_PROJECT_ID,
        })
      } catch (keyErr) {
        console.error('Failed to parse GCP_SERVICE_ACCOUNT_KEY, falling back to ADC:', keyErr)
        storageInstance = new Storage({
          projectId: process.env.GCP_PROJECT_ID,
        })
      }
    } else {
      storageInstance = new Storage({
        projectId: process.env.GCP_PROJECT_ID,
      })
    }

    const bucket = storageInstance.bucket(bucketName)
    const file = bucket.file(storagePath)

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: mimeType,
    })

    return NextResponse.json({
      localMode: false,
      url: signedUrl,
      assetId,
      storagePath,
      domainCategory,
    })
  } catch (error: unknown) {
    console.error('[signed-url API Error]:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
