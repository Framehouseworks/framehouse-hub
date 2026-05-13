import type { CollectionBeforeChangeHook } from 'payload'
import sharp from 'sharp'
import exifReader from 'exif-reader'

export const extractMetadata: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  _originalDoc,
}) => {
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
        const exif = exifReader(metadata.exif)

        // Extract Technical Metadata
        if (exif.image) {
          data.technical = {
            ...data.technical,
            cameraModel: exif.image.Model || data.technical?.cameraModel,
          }
        }

        if (exif.exif) {
          data.technical = {
            ...data.technical,
            iso: exif.exif.ISO ? Number(exif.exif.ISO) : data.technical?.iso,
            aperture: exif.exif.FNumber ? Number(exif.exif.FNumber) : data.technical?.aperture,
            shutterSpeed: exif.exif.ExposureTime
              ? String(exif.exif.ExposureTime)
              : data.technical?.shutterSpeed,
            focalLength: exif.exif.FocalLength
              ? Number(exif.exif.FocalLength)
              : data.technical?.focalLength,
            lensModel: exif.exif.LensModel || data.technical?.lensModel,
          }

          // Capture Date Master Sort Key
          const rawDate = exif.exif.DateTimeOriginal || exif.image?.DateTime
          if (rawDate && !data.captureDate) {
            data.captureDate = new Date(rawDate).toISOString()
          }
        }

        // GPS Location
        if (exif.gps) {
          const lat = exif.gps.GPSLatitude
          const lng = exif.gps.GPSLongitude

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
    // Example: "iceland_2024_01.jpg" -> ["Iceland", "2024"]
    const filename = file.name || ''
    const parts = filename.split(/[._\-\s]+/)
    const systemTags = parts
      .filter((p) => p.length > 3 && !/^\d+$/.test(p)) // Basic filter for meaningful words
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
