/**
 * Canonical storage path contract (must match Go worker implementation):
 *
 * tenants/{user_uuid}/{domain_category}/{year}/{month}/{asset_uuid}/original/{filename}.{ext}
 * tenants/{user_uuid}/{domain_category}/{year}/{month}/{asset_uuid}/derivatives/{size}.webp
 *
 * Segment indices: [0]=tenants [1]=userId [2]=domain [3]=year [4]=month [5]=assetId [6]=original|derivatives [7]=filename
 */

export type DomainCategory =
  | 'visual-media'
  | 'digital-negatives'
  | 'motion-media'
  | 'audio-media'
  | 'structured-records'
  | 'unclassified-artifacts'

export type MediaTypeValue = 'image' | 'raw' | 'video' | 'audio' | 'document' | 'unclassified'

const MIME_TO_DOMAIN: Record<string, DomainCategory> = {
  'image/jpeg': 'visual-media',
  'image/png': 'visual-media',
  'image/webp': 'visual-media',
  'image/svg+xml': 'visual-media',
  'image/gif': 'visual-media',
  'image/tiff': 'visual-media',
  'video/mp4': 'motion-media',
  'video/webm': 'motion-media',
  'video/quicktime': 'motion-media',
  'video/x-msvideo': 'motion-media',
  'audio/mpeg': 'audio-media',
  'audio/wav': 'audio-media',
  'audio/flac': 'audio-media',
  'audio/ogg': 'audio-media',
  'application/pdf': 'structured-records',
}

const RAW_EXTENSIONS = new Set(['dng', 'arw', 'cr2', 'nef', 'orf', 'rw2', 'pef', 'raf'])

const STRUCTURED_EXTENSIONS = new Set(['json', 'csv', 'md', 'txt'])

const DOMAIN_TO_MEDIA_TYPE: Record<DomainCategory, MediaTypeValue> = {
  'visual-media': 'image',
  'digital-negatives': 'raw',
  'motion-media': 'video',
  'audio-media': 'audio',
  'structured-records': 'document',
  'unclassified-artifacts': 'unclassified',
}

export function classifyDomainCategory(mimeType: string, filename: string): DomainCategory {
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  if (RAW_EXTENSIONS.has(ext)) return 'digital-negatives'
  if (STRUCTURED_EXTENSIONS.has(ext)) return 'structured-records'
  if (MIME_TO_DOMAIN[mimeType]) return MIME_TO_DOMAIN[mimeType]

  if (mimeType.startsWith('image/')) return 'visual-media'
  if (mimeType.startsWith('video/')) return 'motion-media'
  if (mimeType.startsWith('audio/')) return 'audio-media'

  return 'unclassified-artifacts'
}

export function domainCategoryToMediaType(category: DomainCategory): MediaTypeValue {
  return DOMAIN_TO_MEDIA_TYPE[category]
}

export function mediaTypeFromMimeAndExtension(mimeType: string, filename: string): MediaTypeValue {
  return domainCategoryToMediaType(classifyDomainCategory(mimeType, filename))
}

// POC upload size limits per ticket FRH-52. Caps are enforced server-side
// at every upload entrypoint (signed-url, register-gcs, register-local)
// and pre-flighted on the client to save round-trip bytes. Stops cost
// surprises on GCS egress and Cloud Run runtime, and rejects obvious
// abuse vectors before the body is even read.
const MB = 1024 * 1024
const GB = 1024 * MB
export const MAX_BYTES_BY_MEDIA_TYPE: Record<MediaTypeValue, number> = {
  image: 250 * MB,
  raw: 5 * GB,
  video: 5 * GB,
  audio: 250 * MB,
  document: 50 * MB,
  unclassified: 50 * MB,
}

export class UploadSizeLimitError extends Error {
  readonly status = 413
  constructor(
    public readonly mediaType: MediaTypeValue,
    public readonly observed: number,
    public readonly limit: number,
  ) {
    super(
      `File exceeds ${(limit / MB).toFixed(0)}MB limit for ${mediaType} (received ${(
        observed / MB
      ).toFixed(1)}MB)`,
    )
    this.name = 'UploadSizeLimitError'
  }
}

export function enforceUploadSizeLimit(mediaType: MediaTypeValue, size: number): void {
  const limit = MAX_BYTES_BY_MEDIA_TYPE[mediaType]
  if (!Number.isFinite(size) || size < 0) {
    throw new Error(`Invalid upload size: ${size}`)
  }
  if (size > limit) throw new UploadSizeLimitError(mediaType, size, limit)
}

function slugifyFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const name = filename.slice(0, filename.length - ext.length - 1)
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${slug || 'file'}.${ext}`
}

export function buildStoragePath(params: {
  userId: string
  domainCategory: DomainCategory
  year: string
  month: string
  assetId: string
  filename: string
}): string {
  const { userId, domainCategory, year, month, assetId, filename } = params
  const slugified = slugifyFilename(filename)
  return `tenants/${userId}/${domainCategory}/${year}/${month}/${assetId}/original/${slugified}`
}

export function buildDerivativePath(params: {
  userId: string
  domainCategory: DomainCategory
  year: string
  month: string
  assetId: string
  derivativeName: string
}): string {
  const { userId, domainCategory, year, month, assetId, derivativeName } = params
  return `tenants/${userId}/${domainCategory}/${year}/${month}/${assetId}/derivatives/${derivativeName}.webp`
}

export interface ParsedStoragePath {
  userId: string
  domainCategory: DomainCategory
  year: string
  month: string
  assetId: string
  segment: 'original' | 'derivatives'
  filename: string
}

const VALID_DOMAINS = new Set<string>([
  'visual-media',
  'digital-negatives',
  'motion-media',
  'audio-media',
  'structured-records',
  'unclassified-artifacts',
])

export function parseStoragePath(path: string): ParsedStoragePath | null {
  const parts = path.split('/')
  if (parts.length < 8 || parts[0] !== 'tenants') return null

  const [, userId, domain, year, month, assetId, segment, ...rest] = parts
  if (!VALID_DOMAINS.has(domain)) return null
  if (segment !== 'original' && segment !== 'derivatives') return null

  const filename = rest.join('/')
  if (!filename) return null

  return {
    userId,
    domainCategory: domain as DomainCategory,
    year,
    month,
    assetId,
    segment,
    filename,
  }
}
