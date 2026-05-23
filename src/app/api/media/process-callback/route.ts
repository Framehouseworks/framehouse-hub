import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { processingEvents } from '@/lib/processing-events'
import { cleanupFailedStorage } from '@/lib/cleanup-failed-storage'

export async function POST(req: Request) {
  try {
    const secretHeader = req.headers.get('x-processor-secret')
    const expectedSecret = process.env.PROCESSOR_CALLBACK_SECRET || 'fallback-dev-secret-key-9988'

    if (!secretHeader || secretHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized callback signature' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const {
      assetId,
      status,
      errorMessage,
      processingStep,
      dimensions,
      technical,
      location,
      thumbnails,
    } = body

    if (!assetId || !status) {
      return NextResponse.json({ error: 'Missing required assetId or status' }, { status: 400 })
    }

    const payload = await getPayload({ config: configPromise })

    // Locate the corresponding asset record
    let mediaDoc = null

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

    // Handle intermediate stage updates (non-terminal)
    if (status === 'stage_update' && processingStep) {
      await payload.update({
        collection: 'media',
        id: mediaDoc.id,
        data: { processingStep },
      })

      processingEvents.emitStatusChange({
        mediaId: String(mediaDoc.id),
        ingestionStatus: mediaDoc.ingestionStatus || 'processing',
        processingStep,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({ success: true })
    }

    // Handle terminal callbacks (ready / failed)
    const updateData: Record<string, unknown> = {
      ingestionStatus: status,
      processedAt: new Date().toISOString(),
      processingStep: status === 'ready' ? 'ready' : status === 'failed' ? 'failed' : undefined,
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

      if (thumbnails) {
        updateData.thumbnailUrl = thumbnails.small || ''
        updateData.proxyUrl = thumbnails.medium || ''
      }
    } else {
      updateData.errorMessage = errorMessage || 'Failed asynchronously during worker processing'
    }

    let updatedMedia
    try {
      updatedMedia = await payload.update({
        collection: 'media',
        id: mediaDoc.id,
        data: updateData,
      })
    } catch (updateErr) {
      // istanbul ignore next
      console.error(`[process-callback] Failed to update media ${mediaDoc.id}:`, updateErr)
      return NextResponse.json(
        {
          error: `Update failed: ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`,
        },
        { status: 500 },
      )
    }

    // On failure: remove storage artifacts (GCS objects or local enclave) but keep the
    // DB record so the user can see and delete the failed asset from the admin.
    if (status === 'failed' && mediaDoc.storagePath) {
      // Fire-and-forget — don't block the callback response on storage cleanup.
      cleanupFailedStorage(mediaDoc.storagePath).catch((err) => {
        console.error(
          `[process-callback] Storage cleanup failed for ${mediaDoc.storagePath}:`,
          err instanceof Error ? err.message : String(err),
        )
      })
    }

    processingEvents.emitStatusChange({
      mediaId: String(mediaDoc.id),
      ingestionStatus: status,
      processingStep:
        status === 'ready' ? 'ready' : status === 'failed' ? 'failed' : 'registering_assets',
      timestamp: new Date().toISOString(),
      errorMessage,
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
