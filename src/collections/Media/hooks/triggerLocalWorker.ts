import type { CollectionAfterChangeHook } from 'payload'

// Local-mode dispatcher for the Go ingestion worker. Files are already laid
// down in the tenant enclave by `writeOriginalToEnclave` (beforeChange), so
// this hook is now purely a notification: post the storagePath at the worker
// and let it run EXIF + thumbnail generation asynchronously. In cloud mode
// the worker is invoked directly by GCS Eventarc, so we no-op.
export const triggerLocalWorker: CollectionAfterChangeHook = async ({ doc, req, operation }) => {
  if (operation !== 'create') return

  const isCloudMode = !!process.env.GCS_BUCKET
  const asyncDisabled = process.env.LOCAL_ASYNC_PROCESSING === 'false'
  if (isCloudMode || asyncDisabled) return

  const storagePath = (doc as { storagePath?: string }).storagePath
  if (!storagePath) {
    req.payload.logger.warn(
      `[Local Worker Trigger] Doc ${doc.id} has no storagePath; skipping worker dispatch`,
    )
    return
  }

  const workerUrl = process.env.LOCAL_WORKER_URL || 'http://localhost:8080'
  req.payload.logger.info(`[Local Worker Trigger] Dispatching ${storagePath} → ${workerUrl}`)

  fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket: 'local', name: storagePath }),
  }).catch((err) => {
    req.payload.logger.error(
      `[Local Worker Trigger] Worker dispatch failed (${workerUrl}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
  })
}
