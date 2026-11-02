/**
 * Preview type definitions and size threshold constants for Transfer Deliverables (FRH-82).
 */

export const PREVIEW_THRESHOLDS = {
  IMAGE_MAX_BYTES: 10 * 1024 * 1024, // 10MB
  DOCUMENT_MAX_BYTES: 15 * 1024 * 1024, // 15MB
  VIDEO_MAX_BYTES: 25 * 1024 * 1024, // 25MB
  AUDIO_MAX_BYTES: 25 * 1024 * 1024, // 25MB
} as const

export type PreviewMediaType = 'image' | 'video' | 'audio' | 'document' | 'unsupported'

export interface PreviewEligibility {
  eligible: boolean
  mediaType: PreviewMediaType
  reason?: 'unsupported' | 'size_exceeded'
  message?: string
}

export interface TransferPreviewResponse {
  eligible: boolean
  mediaType: PreviewMediaType
  reason?: 'unsupported' | 'size_exceeded'
  message?: string
  previewUrl?: string
  mimeType?: string
  filename?: string
  filesize?: number
}

const SUPPORTED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp']
const SUPPORTED_IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp']

const SUPPORTED_DOCUMENT_MIMES = ['application/pdf']
const SUPPORTED_DOCUMENT_EXTS = ['pdf']

const SUPPORTED_VIDEO_MIMES = ['video/mp4', 'video/webm']
const SUPPORTED_VIDEO_EXTS = ['mp4', 'webm']

const SUPPORTED_AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']
const SUPPORTED_AUDIO_EXTS = ['mp3', 'wav', 'ogg']

/**
 * Determine the preview media type and eligibility based on MIME type, extension, and file size.
 */
export function evaluatePreviewEligibility(
  filename: string,
  mimeType: string,
  filesize: number,
): PreviewEligibility {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const normalizedMime = mimeType.toLowerCase()

  // 1. Check Raster Images
  if (SUPPORTED_IMAGE_MIMES.includes(normalizedMime) || SUPPORTED_IMAGE_EXTS.includes(ext)) {
    if (filesize > PREVIEW_THRESHOLDS.IMAGE_MAX_BYTES) {
      return {
        eligible: false,
        mediaType: 'image',
        reason: 'size_exceeded',
        message: 'Image exceeds 10MB preview limit. Download directly to view.',
      }
    }
    return { eligible: true, mediaType: 'image' }
  }

  // 2. Check Document (PDF)
  if (SUPPORTED_DOCUMENT_MIMES.includes(normalizedMime) || SUPPORTED_DOCUMENT_EXTS.includes(ext)) {
    if (filesize > PREVIEW_THRESHOLDS.DOCUMENT_MAX_BYTES) {
      return {
        eligible: false,
        mediaType: 'document',
        reason: 'size_exceeded',
        message: 'Document exceeds 15MB preview limit. Download directly to view.',
      }
    }
    return { eligible: true, mediaType: 'document' }
  }

  // 3. Check Video
  if (SUPPORTED_VIDEO_MIMES.includes(normalizedMime) || SUPPORTED_VIDEO_EXTS.includes(ext)) {
    if (filesize > PREVIEW_THRESHOLDS.VIDEO_MAX_BYTES) {
      return {
        eligible: false,
        mediaType: 'video',
        reason: 'size_exceeded',
        message: 'Video exceeds 25MB preview limit. Download directly to view.',
      }
    }
    return { eligible: true, mediaType: 'video' }
  }

  // 4. Check Audio
  if (SUPPORTED_AUDIO_MIMES.includes(normalizedMime) || SUPPORTED_AUDIO_EXTS.includes(ext)) {
    if (filesize > PREVIEW_THRESHOLDS.AUDIO_MAX_BYTES) {
      return {
        eligible: false,
        mediaType: 'audio',
        reason: 'size_exceeded',
        message: 'Audio exceeds 25MB preview limit. Download directly to view.',
      }
    }
    return { eligible: true, mediaType: 'audio' }
  }

  // 5. Unsupported formats (RAW, Archives, Code, Project files, etc.)
  return {
    eligible: false,
    mediaType: 'unsupported',
    reason: 'unsupported',
    message: 'This file format is not supported for inline browser preview. Download directly to view.',
  }
}

