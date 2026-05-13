import type { CollectionBeforeChangeHook } from 'payload'
import sharp from 'sharp'
import exifReader from 'exif-reader'

export const extractMetadata: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  // Only run on create or if a new file is uploaded
  if (operation !== 'create' && !req.file) {
    return data
  }

  const file = req.file
  if (!file || !file.data) {
    return data
  }

  try {
    const metadata = await sharp(file.data).metadata()

    // 1. Basic Dimensions
    data.width = metadata.width
    data.height = metadata.height
    if (metadata.width && metadata.height) {
      data.aspectRatio = (metadata.width / metadata.height).toFixed(2)
    }

    // 2. EXIF Data
    if (metadata.exif) {
      try {
        const exif = exifReader(metadata.exif) as any

        // Extract Technical Metadata
        // Using common EXIF property paths with fallbacks
        const image = exif.Image || exif.image
        const exifData = exif.Exif || exif.exif
        const gps = exif.GPS || exif.gps

        if (image) {
          data.technical = {
            ...data.technical,
            cameraModel: image.Model || data.technical?.cameraModel,
          }
        }

        if (exifData) {
          data.technical = {
            ...data.technical,
            iso: exifData.ISO ? Number(exifData.ISO) : data.technical?.iso,
            aperture: exifData.FNumber ? Number(exifData.FNumber) : data.technical?.aperture,
            shutterSpeed: exifData.ExposureTime
              ? String(exifData.ExposureTime)
              : data.technical?.shutterSpeed,
            focalLength: exifData.FocalLength
              ? Number(exifData.FocalLength)
              : data.technical?.focalLength,
            lensModel: exifData.LensModel || data.technical?.lensModel,
          }

          // Capture Date Master Sort Key
          const rawDate = exifData.DateTimeOriginal || image?.DateTime
          if (rawDate && !data.captureDate) {
            data.captureDate = new Date(rawDate).toISOString()
          }
        }

        // GPS Location
        if (gps) {
          const lat = gps.GPSLatitude
          const lng = gps.GPSLongitude

          if (lat && lng) {
            data.location = {
              ...data.location,
              latitude: lat,
              longitude: lng,
            }
          }
        }
      } catch (exifErr) {
        req.payload.logger.error(`EXIF Parsing Error: ${exifErr}`)
      }
    }

    // 3. Fallbacks
    if (!data.captureDate) {
      data.captureDate = new Date().toISOString()
    }

    // 4. Heuristic Tagging (Filename Parsing)
    const filename = file.name || ''
    const parts = filename.split(/[._\-\s]+/)
    const systemTags = parts
      .filter((p) => p.length > 3 && !/^\d+$/.test(p))
      .map((p) => ({ tag: p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() }))

    if (systemTags.length > 0) {
      data.heuristicTags = systemTags
    }

    // 5. Ingestion Lifecycle
    data.ingestionStatus = 'ready'
    data.processedAt = new Date().toISOString()
  } catch (err) {
    req.payload.logger.error(`Metadata Extraction Failed: ${err}`)
    data.ingestionStatus = 'failed'
    data.errorMessage = err instanceof Error ? err.message : String(err)
  }

  return data
}
