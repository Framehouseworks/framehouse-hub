import type { CollectionBeforeChangeHook } from 'payload'
import sharp from 'sharp'
import exifReader from 'exif-reader'
import { buildHeuristicTags } from '@/lib/heuristicTags'

export const extractMetadata: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  // Only run on create or when a new file is uploaded
  if (operation !== 'create' && !req.file) {
    return data
  }

  const file = req.file
  if (!file || !file.data) {
    return data
  }

  try {
    // 0. Identity — derive title from filename if absent
    if (!data.title && file.name) {
      data.title = file.name.split('.').slice(0, -1).join('.') || file.name
    }

    const isCloudMode = !!process.env.GCS_BUCKET
    const useAsync = isCloudMode || process.env.LOCAL_ASYNC_PROCESSING !== 'false'

    if (useAsync) {
      // Heavy processing (dimensions, full EXIF, thumbnails) is deferred to the
      // Go worker which calls back via /api/media/process-callback.
      // We still generate filename-based heuristic tags here because:
      //   a) the file buffer IS available right now
      //   b) they do not require EXIF or heavy processing
      //   c) temporal tags are added by process-callback once captureDate is known
      data.ingestionStatus = 'processing'

      const filenameTags = buildHeuristicTags({ filename: file.name })
      if (filenameTags.length > 0) {
        data.heuristicTags = filenameTags
      }

      return data
    }

    // ── Synchronous local mode ────────────────────────────────────────────────
    const metadata = await sharp(file.data).metadata()

    // 1. Dimensions
    data.width = metadata.width
    data.height = metadata.height
    if (metadata.width && metadata.height) {
      data.aspectRatio = (metadata.width / metadata.height).toFixed(2)
    }

    // 2. EXIF
    if (metadata.exif) {
      try {
        const exif = exifReader(metadata.exif) as Record<string, unknown>

        const image = (exif.Image || exif.image) as Record<string, unknown> | undefined
        const exifData = (exif.Exif || exif.exif) as Record<string, unknown> | undefined
        const gps = (exif.GPS || exif.gps) as Record<string, unknown> | undefined

        if (image) {
          const make = (image.Make || image.make) as string | undefined
          const model = (image.Model || image.model) as string | undefined
          // Strip the make prefix from model when present (e.g. "Sony ILCE-7M4" → model "ILCE-7M4")
          const cleanModel =
            make && model && model.toLowerCase().startsWith(make.toLowerCase())
              ? model.slice(make.length).trim()
              : model
          data.technical = {
            ...data.technical,
            ...(make ? { cameraMake: make.trim() } : {}),
            ...(cleanModel ? { cameraModel: cleanModel } : {}),
          }
        }

        if (exifData) {
          data.technical = {
            ...data.technical,
            iso: exifData.ISO || exifData.iso ? Number(exifData.ISO || exifData.iso) : data.technical?.iso,
            aperture: exifData.FNumber || exifData.fNumber ? Number(exifData.FNumber || exifData.fNumber) : data.technical?.aperture,
            shutterSpeed: exifData.ExposureTime || exifData.exposureTime ? String(exifData.ExposureTime || exifData.exposureTime) : data.technical?.shutterSpeed,
            focalLength: exifData.FocalLength || exifData.focalLength ? Number(exifData.FocalLength || exifData.focalLength) : data.technical?.focalLength,
            lensModel: ((exifData.LensModel || exifData.lensModel) as string) || data.technical?.lensModel,
          }

          const rawDate =
            exifData.DateTimeOriginal ||
            exifData.dateTimeOriginal ||
            image?.DateTime ||
            image?.dateTime
          if (rawDate && !data.captureDate) {
            try {
              data.captureDate = new Date(rawDate as string).toISOString()
            } catch {
              req.payload.logger.warn(`Invalid EXIF Date: ${rawDate}`)
            }
          }
        }

        if (gps) {
          const lat = gps.GPSLatitude as number
          const lng = gps.GPSLongitude as number
          if (lat && lng) {
            data.location = { ...data.location, latitude: lat, longitude: lng }
          }
        }
      } catch (exifErr) {
        req.payload.logger.error(`EXIF Parsing Error: ${exifErr}`)
      }
    }

    // 3. Heuristic tags — filename + temporal (captureDate now known)
    const heuristicTags = buildHeuristicTags({
      filename: file.name,
      captureDate: data.captureDate as string | null | undefined,
    })
    if (heuristicTags.length > 0) {
      data.heuristicTags = heuristicTags
    }

    data.ingestionStatus = 'ready'
    data.processedAt = new Date().toISOString()
  } catch (err) {
    req.payload.logger.error(`Metadata Extraction Failed: ${err}`)
    data.ingestionStatus = 'failed'
    data.errorMessage = err instanceof Error ? err.message : String(err)
  }

  return data
}
