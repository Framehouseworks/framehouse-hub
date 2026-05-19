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
    // 0. Identity
    if (!data.title && file.name) {
      data.title = file.name.split('.').slice(0, -1).join('.') || file.name
    }

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
        const exif = exifReader(metadata.exif) as Record<string, unknown>

        // Extract Technical Metadata
        // Using common EXIF property paths with fallbacks
        const image = (exif.Image || exif.image) as Record<string, unknown> | undefined
        const exifData = (exif.Exif || exif.exif) as Record<string, unknown> | undefined
        const gps = (exif.GPS || exif.gps) as Record<string, unknown> | undefined

        if (image) {
          const camera = (image.Model || image.model) as string | undefined
          if (camera) {
            data.technical = {
              ...data.technical,
              cameraModel: camera,
            }
          }
        }

        if (exifData) {
          data.technical = {
            ...data.technical,
            iso:
              exifData.ISO || exifData.iso
                ? Number(exifData.ISO || exifData.iso)
                : data.technical?.iso,
            aperture:
              exifData.FNumber || exifData.fNumber
                ? Number(exifData.FNumber || exifData.fNumber)
                : data.technical?.aperture,
            shutterSpeed:
              exifData.ExposureTime || exifData.exposureTime
                ? String(exifData.ExposureTime || exifData.exposureTime)
                : data.technical?.shutterSpeed,
            focalLength:
              exifData.FocalLength || exifData.focalLength
                ? Number(exifData.FocalLength || exifData.focalLength)
                : data.technical?.focalLength,
            lensModel:
              ((exifData.LensModel || exifData.lensModel) as string) || data.technical?.lensModel,
          }

          // Capture Date Master Sort Key
          const rawDate =
            exifData.DateTimeOriginal ||
            exifData.dateTimeOriginal ||
            image?.DateTime ||
            image?.dateTime
          if (rawDate && !data.captureDate) {
            try {
              data.captureDate = new Date(rawDate as string).toISOString()
            } catch (_dateErr) {
              req.payload.logger.warn(`Invalid EXIF Date: ${rawDate}`)
            }
          }
        }

        // GPS Location
        if (gps) {
          const lat = gps.GPSLatitude as number
          const lng = gps.GPSLongitude as number

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

    // 4. Intelligent Heuristics & Sentiment
    const intelligentTags: { tag: string }[] = []

    // Temporal Sentiment (Seasons & Years)
    if (data.captureDate) {
      const date = new Date(data.captureDate as string)
      const year = date.getFullYear()
      const month = date.getMonth() // 0-11

      let season = ''
      if (month >= 2 && month <= 4) season = 'Spring'
      else if (month >= 5 && month <= 7) season = 'Summer'
      else if (month >= 8 && month <= 10) season = 'Autumn'
      else season = 'Winter'

      intelligentTags.push({ tag: `${season} ${year}` })

      // Golden Hour Heuristic (Approximation: 4-7 PM)
      const hour = date.getHours()
      if (hour >= 16 && hour <= 19) {
        intelligentTags.push({ tag: 'Golden Hour' })
      }
    }

    // Filename Heuristics (Existing)
    const filename = file.name || ''
    const parts = filename.split(/[._\-\s]+/)
    const filenameTags = parts
      .filter((p) => p.length > 3 && !/^\d+$/.test(p))
      .map((p) => ({ tag: p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() }))

    // 5. AI Vision Placeholder (Enterprise Ready)
    /* 
    if (process.env.GCP_VISION_API_KEY) {
      // Future: Integrate GCP Vision for 'Landscapes', 'Architecture', 'Portrait' extraction
      // data.aiTags = await extractAITags(file.data)
    } 
    */

    const finalHeuristicTags = [...intelligentTags, ...filenameTags]
    if (finalHeuristicTags.length > 0) {
      // Dedup tags
      const uniqueTags = Array.from(new Set(finalHeuristicTags.map((t) => t.tag)))
      data.heuristicTags = uniqueTags.map((t) => ({ tag: t }))
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
