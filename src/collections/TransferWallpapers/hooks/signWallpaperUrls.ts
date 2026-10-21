import type { CollectionAfterReadHook, PayloadRequest } from 'payload'

const SIGNED_URL_TTL_MS = 60 * 60 * 1000 // 1 hour

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
  const rawKey = process.env.GCP_SERVICE_ACCOUNT_KEY || process.env.GCS_CREDENTIALS
  if (rawKey) {
    try {
      const credentials = JSON.parse(rawKey)
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

/**
 * In cloud mode (GCS_BUCKET set), rewrites raw GCS storage URLs
 * (`https://storage.googleapis.com/{bucket}/wallpapers/...`) on the wallpaper document
 * (including generated image sizes `sizes.thumbnail.url` and `sizes.desktop.url`)
 * to v4 signed GET URLs so the browser can display them from the private bucket.
 */
export const signWallpaperUrls: CollectionAfterReadHook = async ({ doc, req }) => {
  const bucketName = process.env.GCS_BUCKET
  if (!bucketName || !doc) return doc

  const r = req as RequestWithCache
  const cache = r._signedUrlCache ?? new Map<string, string>()
  r._signedUrlCache = cache

  const prefix = `https://storage.googleapis.com/${bucketName}/`
  let storage: StorageInstance | null = null

  const signUrl = async (rawUrl: unknown): Promise<string | null> => {
    if (typeof rawUrl !== 'string' || !rawUrl.startsWith(prefix)) return null
    if (rawUrl.includes('X-Goog-Algorithm')) return rawUrl

    const withoutQuery = rawUrl.split('?')[0]
    const objectPath = withoutQuery.slice(prefix.length)
    if (!objectPath) return null

    if (cache.has(objectPath)) return cache.get(objectPath) ?? null
    if (!storage) storage = await getStorage(r)

    try {
      const [signed] = await storage
        .bucket(bucketName)
        .file(objectPath)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + SIGNED_URL_TTL_MS,
        })
      cache.set(objectPath, signed)
      return signed
    } catch (err) {
      req.payload?.logger?.error?.(
        `[signWallpaperUrls] sign failed for ${objectPath}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      )
      return null
    }
  }

  const out: Record<string, any> = { ...doc }

  // 1. Sign canonical url if present
  if (out.url) {
    const signed = await signUrl(out.url)
    if (signed) out.url = signed
  }

  // 2. Sign custom assetUrl or mobileAssetUrl if pointing to GCS
  if (out.assetUrl) {
    const signed = await signUrl(out.assetUrl)
    if (signed) out.assetUrl = signed
  }
  if (out.mobileAssetUrl) {
    const signed = await signUrl(out.mobileAssetUrl)
    if (signed) out.mobileAssetUrl = signed
  }

  // 3. Sign generated image sizes
  if (out.sizes && typeof out.sizes === 'object') {
    const sizes = { ...out.sizes }
    for (const sizeKey of Object.keys(sizes)) {
      if (sizes[sizeKey] && typeof sizes[sizeKey] === 'object' && sizes[sizeKey].url) {
        const signed = await signUrl(sizes[sizeKey].url)
        if (signed) {
          sizes[sizeKey] = {
            ...sizes[sizeKey],
            url: signed,
          }
        }
      }
    }
    out.sizes = sizes
  }

  return out
}
