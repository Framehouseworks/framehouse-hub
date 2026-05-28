import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { processingEvents } from '@/lib/processing-events'
import { cleanupFailedStorage } from '@/lib/cleanup-failed-storage'
import { buildHeuristicTags, mergeHeuristicTags } from '@/lib/heuristicTags'

// Per-user debounce for generateSmartCollections: only fire once per 45s
// regardless of how many assets complete in that window. Module-level map
// is sufficient — Cloud Run effectively single-process under free-tier load.
const generateDebounce = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleGenerate(payload: Awaited<ReturnType<typeof import('payload').getPayload>>, ownerId: string | number) {
  const key = String(ownerId)
  const existing = generateDebounce.get(key)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(async () => {
    generateDebounce.delete(key)
    try {
      const { generateSmartCollections } = await import('@/lib/autoGenerateCollections')
      await generateSmartCollections(payload, ownerId)
    } catch (err) {
      console.error('[process-callback] generateSmartCollections error:', err)
    }
  }, 45_000) // wait 45s after last ready asset before generating

  generateDebounce.set(key, timer)
}

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

    // Locate the corresponding asset record.
    // Retry with backoff to handle the cloud race condition: Eventarc can fire the worker
    // before the client's register-gcs call has committed the DB doc (corrupt files fail
    // the header check in < 1s and call back immediately, while valid files take 10–60s
    // to process so the race window never matters for them).
    let mediaDoc = null
    const retryDelays = [0, 1500, 2000, 2500] // ms; total max ~6s, within worker's 15s timeout

    for (let attempt = 0; attempt < retryDelays.length; attempt++) {
      if (retryDelays[attempt] > 0) {
        await new Promise((r) => setTimeout(r, retryDelays[attempt]))
      }

      try {
        mediaDoc = await payload.findByID({
          collection: 'media',
          id: assetId,
        })
      } catch {
        // Payload throws when ID type mismatches (UUID vs integer) — expected
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
        mediaDoc = mediaDocs?.[0] ?? null
      }

      if (mediaDoc) break

      console.warn(
        `[process-callback] Doc not found for assetId=${assetId}, attempt ${attempt + 1}/${retryDelays.length}`,
      )
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
        // Separate make from model if worker sends a combined cameraModel string
        let cameraMake: string = technical.cameraMake || ''
        let cameraModel: string = technical.cameraModel || ''
        if (!cameraMake && cameraModel) {
          // Heuristic: first token of "Sony ILCE-7M4" is the make
          const parts = cameraModel.split(/\s+/)
          if (parts.length > 1) {
            cameraMake = parts[0]
            cameraModel = parts.slice(1).join(' ')
          }
        }
        // Strip make prefix from model when redundant (e.g. "Sony ILCE-7M4" → "ILCE-7M4")
        if (cameraMake && cameraModel.toLowerCase().startsWith(cameraMake.toLowerCase())) {
          cameraModel = cameraModel.slice(cameraMake.length).trim()
        }

        updateData.technical = {
          cameraMake: cameraMake || '',
          cameraModel: cameraModel || '',
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

      // Temporal heuristic tags — only computable once captureDate is known.
      // Merges with filename-based tags set during extractMetadata (async mode).
      const captureDate = (updateData.captureDate as string | undefined) || mediaDoc.captureDate
      if (captureDate) {
        const temporalTags = buildHeuristicTags({ captureDate })
        if (temporalTags.length > 0) {
          updateData.heuristicTags = mergeHeuristicTags(
            mediaDoc.heuristicTags as { tag?: string; id?: string }[] | null,
            temporalTags,
          )
        }
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

    // Schedule smart-collection generation once asset is ready.
    if (status === 'ready') {
      const ownerId = typeof mediaDoc.owner === 'object' ? mediaDoc.owner?.id : mediaDoc.owner
      if (ownerId) scheduleGenerate(payload, ownerId)
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
