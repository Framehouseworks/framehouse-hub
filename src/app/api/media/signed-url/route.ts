import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'

export async function POST(req: Request) {
  try {
    // 1. Authenticate user via Payload session
    const headers = await getHeaders()
    const payload = await getPayload({ config: configPromise })
    const { user } = await payload.auth({ headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { filename, mimeType } = body

    if (!filename || !mimeType) {
      return NextResponse.json({ error: 'Missing required filename or mimeType' }, { status: 400 })
    }

    // 2. Check if Cloud Storage is configured
    const bucketName = process.env.GCS_BUCKET
    if (!bucketName) {
      // Local development fallback: proceed with synchronous multipart POST
      return NextResponse.json({ localMode: true })
    }

    // 3. Generate cryptographic UUID and GCS storage path matching specification
    const crypto = await import('crypto')
    const assetId = crypto.randomUUID()
    const year = new Date().getFullYear().toString()
    const extension = filename.split('.').pop() || ''

    // Prefix structure: /[USER_UUID]/[YEAR]/[ASSET_UUID]/original.[EXT]
    const storagePath = `${user.id}/${year}/${assetId}/original.${extension}`

    // 4. Initialize GCS Client using service account keys or ADC
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

    // 5. Generate secure, cryptographically bound Signed PUT URL (15 minutes expiry)
    // Binding content-type prevents malicious MIME spoofing attacks
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
    })
  } catch (error: unknown) {
    console.error('[signed-url API Error]:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
