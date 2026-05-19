import type { CollectionAfterChangeHook } from 'payload'

export const triggerLocalWorker: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  // Only trigger on new creations
  if (operation !== 'create') return

  // Only trigger if we are in local async mode
  const isCloudMode = !!process.env.GCS_BUCKET
  const useAsync = isCloudMode || process.env.LOCAL_ASYNC_PROCESSING !== 'false'

  // GCS writes are handled automatically by Eventarc in production.
  // We ONLY dispatch manually in local development to mirror cloud production.
  if (isCloudMode || !useAsync) return

  try {
    const ownerId = typeof doc.owner === 'object' ? doc.owner?.id : doc.owner
    const year = new Date(doc.createdAt).getFullYear()
    const assetId = doc.id
    const filename = doc.filename

    if (!filename) return

    // Construct local-matching Eventarc payload
    // name MUST match: USER_ID/YEAR/ASSET_ID/filename
    const payload = {
      bucket: 'local',
      name: `${ownerId}/${year}/${assetId}/${filename}`,
    }

    const workerUrl = process.env.LOCAL_WORKER_URL || 'http://localhost:8080'
    req.payload.logger.info(
      `[Local Worker Trigger] Dispatching async process to ${workerUrl} for asset ${doc.id}`,
    )

    // Detached fetch call (do not await to ensure upload success response is immediate)
    fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      req.payload.logger.error(
        `[Local Worker Trigger] Failed to contact Go worker at ${workerUrl}: ${err}`,
      )
    })
  } catch (err) {
    req.payload.logger.error(`[Local Worker Trigger] Error during local worker dispatch: ${err}`)
  }
}
