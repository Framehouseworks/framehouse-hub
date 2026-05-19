import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function POST(req: Request) {
  try {
    // 1. Verify Callback Secret Signature (Prevent rogue updates)
    const secretHeader = req.headers.get('x-processor-secret')
    const expectedSecret = process.env.PROCESSOR_CALLBACK_SECRET || 'fallback-dev-secret-key-9988'

    if (!secretHeader || secretHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized callback signature' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      assetId,
      status, // 'ready' or 'failed'
      errorMessage,
      dimensions,
      technical,
      location,
      thumbnails,
    } = body

    if (!assetId || !status) {
      return NextResponse.json({ error: 'Missing required assetId or status' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })

    // 2. Locate the corresponding asset record using a dual-mode lookup strategy
    let mediaDoc = null

    // Try primary key ID lookup first (used in local async mode where assetId is the record ID)
    try {
      mediaDoc = await payload.findByID({
        collection: 'media',
        id: assetId,
      })
    } catch {
      // Fallback to GCS originalUrl contains search
    }

    if (!mediaDoc) {
      const { docs: mediaDocs } = await payload.find({
        collection: 'media',
        where: {
          originalUrl: {
            contains: assetId,
          },
        },
        limit: 1,
      })
      mediaDoc = mediaDocs?.[0]
    }

    if (!mediaDoc) {
      return NextResponse.json(
        { error: `Asset with identifier ${assetId} not found` },
        { status: 404 },
      )
    }

    // 3. Update the media record in the database
    const updateData: Record<string, unknown> = {
      ingestionStatus: status,
      processedAt: new Date().toISOString(),
    }

    if (status === 'ready') {
      if (dimensions) {
        updateData.width = dimensions.width
        updateData.height = dimensions.height
        if (dimensions.width && dimensions.height) {
          updateData.aspectRatio = (dimensions.width / dimensions.height).toFixed(2)
        }
      }

      if (technical) {
        updateData.technical = {
          cameraModel: technical.cameraModel || '',
          lensModel: technical.lensModel || '',
          iso: Number(technical.iso) || undefined,
          aperture: Number(technical.aperture) || undefined,
          shutterSpeed: technical.shutterSpeed || '',
          focalLength: Number(technical.focalLength) || undefined,
        }

        // Set captureDate timeline master sort key
        if (technical.captureDate && !mediaDoc.captureDate) {
          try {
            updateData.captureDate = new Date(technical.captureDate).toISOString()
          } catch (_dateErr) {
            console.warn(`Invalid date format from processor: ${technical.captureDate}`)
          }
        }
      }

      if (location) {
        updateData.location = {
          latitude: Number(location.latitude) || undefined,
          longitude: Number(location.longitude) || undefined,
          address: location.address || mediaDoc.location?.address || '',
        }
      }

      // Assign GCS thumbnail references
      if (thumbnails) {
        updateData.thumbnailUrl = thumbnails.small || ''
        updateData.proxyUrl = thumbnails.medium || ''
      }
    } else {
      updateData.errorMessage = errorMessage || 'Failed asynchronously during worker processing'
    }

    // Direct local update to save changes to PostgreSQL
    const updatedMedia = await payload.update({
      collection: 'media',
      id: mediaDoc.id,
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      media: updatedMedia,
    })
  } catch (error: unknown) {
    console.error('[process-callback API Error]:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
