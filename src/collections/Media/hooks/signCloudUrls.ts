import type { CollectionAfterReadHook, PayloadRequest } from 'payload'

// In cloud mode (GCS_BUCKET set), rewrite originalUrl / thumbnailUrl /
// proxyUrl to v4 signed GET URLs so the private bucket is fetchable from
// the browser without an allUsers grant. Local mode is a no-op — those
// URLs are already `/media/...` paths Next serves from `public/`.
//
// Signing reuses the same ADC + iam.serviceAccountTokenCreator self-grant
// that powers the upload-side signing in src/app/api/media/signed-url/route.ts.
// A per-request cache keyed by object path makes the cost O(unique paths)
// even when the same Media doc is read multiple times in one HTTP request.

const SIGNED_URL_TTL_MS = 60 * 60 * 1000 // 1 h
const SIGNABLE_FIELDS = ['originalUrl', 'thumbnailUrl', 'proxyUrl'] as const

type SignableField = (typeof SIGNABLE_FIELDS)[number]

type StorageInstance = {
  bucket: (name: string) => {
    file: (path: string) => {
      getSignedUrl: (opts: { version: 'v4'; action: 'read'; expires: number }) => Promise<[string]>
    }
  }
}

type RequestWithCache = PayloadRequest & {
  _signedUrlCache?: Map<string, string>
  _signedUrlStorage?: StorageInstance
}

async function getStorage(req: RequestWithCache): Promise<StorageInstance> {
  if (req._signedUrlStorage) return req._signedUrlStorage
  const { Storage } = await import('@google-cloud/storage')
  let instance: StorageInstance
  if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
    try {
      const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
      instance = new Storage({
        credentials,
        projectId: process.env.GCS_PROJECT_ID,
      }) as unknown as StorageInstance
    } catch {
      instance = new Storage({
        projectId: process.env.GCS_PROJECT_ID,
      }) as unknown as StorageInstance
    }
  } else {
    instance = new Storage({ projectId: process.env.GCS_PROJECT_ID }) as unknown as StorageInstance
  }
  req._signedUrlStorage = instance
  return instance
}

export const signCloudUrls: CollectionAfterReadHook = async ({ doc, req }) => {
  const bucketName = process.env.GCS_BUCKET
  if (!bucketName) return doc

  const r = req as RequestWithCache
  const cache = r._signedUrlCache ?? new Map<string, string>()
  r._signedUrlCache = cache

  const prefix = `https://storage.googleapis.com/${bucketName}/`
  const out: Record<string, unknown> = { ...doc }
  let storage: StorageInstance | null = null

  const signOne = async (objectPath: string): Promise<string | null> => {
    if (cache.has(objectPath)) return cache.get(objectPath) ?? null
    if (!storage) storage = await getStorage(r)
    try {
      const [url] = await storage
        .bucket(bucketName)
        .file(objectPath)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + SIGNED_URL_TTL_MS,
        })
      cache.set(objectPath, url)
      return url
    } catch (err) {
      // Don't blank the URL on signing failure — fall back to the raw GCS URL
      // (which will 403 in the browser, but at least surfaces the path for
      // log diagnosis). Better than rendering an empty card silently.
      req.payload?.logger?.error?.(
        `[signCloudUrls] sign failed for ${objectPath}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
      return null
    }
  }

  for (const field of SIGNABLE_FIELDS as readonly SignableField[]) {
    const val = (doc as Record<string, unknown>)[field]
    if (typeof val !== 'string' || !val.startsWith(prefix)) continue
    const objectPath = val.slice(prefix.length)
    if (!objectPath) continue
    const signed = await signOne(objectPath)
    if (signed) out[field] = signed
  }

  return out
}
