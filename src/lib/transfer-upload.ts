/**
 * Transfer Upload Service (FRH-67 & FRH-79 Multi-File Link Transfers)
 *
 * Unified client-side upload pipeline for Link Transfers.
 * - Supports single-file and multi-file batch uploads (up to 5 files / 250MB total)
 * - Requests signed PUT URLs (or local mode tokens) from /api/transfers/signed-url
 * - Employs Screen Wake Lock API during mobile transfers to avoid sleep interruption
 * - Streams binary bytes directly via XHR without in-memory buffering to satisfy Cloud Run 512Mi & mobile limits
 * - Tracks per-file and aggregate transfer progress
 * - Registers final document via native Payload REST API
 */

import { MAX_TRANSFER_BYTES, MAX_TRANSFER_FILES } from '@/collections/Transfers/constants'
export { MAX_TRANSFER_BYTES, MAX_TRANSFER_FILES }

export interface TransferFileProgress {
  filename: string
  filesize: number
  loaded: number
  percent: number
  status: 'pending' | 'uploading' | 'complete' | 'failed'
  error?: string
}

export interface BatchTransferUploadOptions {
  files: File[]
  title?: string
  message?: string
  password?: string
  onProgress?: (overallPercent: number, fileStatuses: TransferFileProgress[]) => void
  signal?: AbortSignal
}

export interface TransferUploadOptions {
  file: File
  title?: string
  message?: string
  password?: string
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export interface TransferFileItem {
  filename: string
  filesize: number
  mimeType: string
  storagePath: string
}

export interface TransferUploadResult {
  shareHash: string
  publicUrl: string
  expiresAt: string
  transferId: number
  filename: string
  filesize: number
  files?: TransferFileItem[]
}

export class TransferUploadError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'TransferUploadError'
  }
}

/**
 * Upload multiple files under a single transfer session (FRH-79).
 */
export async function uploadTransferBatch(
  options: BatchTransferUploadOptions,
): Promise<TransferUploadResult> {
  const { files, title, message, password, onProgress, signal } = options

  // 1. Client-side pre-flight validations
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new TransferUploadError('No files provided')
  }

  if (files.length > MAX_TRANSFER_FILES) {
    throw new TransferUploadError(
      `You can upload up to ${MAX_TRANSFER_FILES} files per transfer session. You selected ${files.length}.`,
      400,
    )
  }

  let totalBatchBytes = 0
  for (const file of files) {
    if (file.size <= 0) {
      throw new TransferUploadError(
        `File "${file.name}" is empty (0 bytes). Please select files with content.`,
      )
    }
    totalBatchBytes += file.size
  }

  if (totalBatchBytes > MAX_TRANSFER_BYTES) {
    const sizeMB = (totalBatchBytes / (1024 * 1024)).toFixed(1)
    const message =
      files.length === 1
        ? `This file is ${sizeMB}MB, which exceeds our 250MB transfer limit. Please choose a file under 250MB.`
        : `Total batch size is ${sizeMB}MB, which exceeds our 250MB transfer limit. Please reduce your selection.`
    throw new TransferUploadError(message, 413)
  }

  // Request Screen Wake Lock if available (mobile iOS/Android protection against sleep dropouts)
  let wakeLockSentinel: any = null
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen')
    } catch {
      // Wake Lock optional / unsupported in insecure or background contexts
    }
  }

  // 2. Request batch signed upload URLs
  let signData: any
  try {
    const signRes = await fetch('/api/transfers/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        files: files.map((f) => ({
          filename: f.name,
          filesize: f.size,
          mimeType: f.type || 'application/octet-stream',
        })),
      }),
      signal,
    })

    if (!signRes.ok) {
      let errorDetail = `Signed URL request failed with status ${signRes.status}`
      try {
        const errJson = await signRes.json()
        if (errJson?.error) errorDetail = errJson.error
      } catch {
        /* ignore */
      }
      throw new TransferUploadError(errorDetail, signRes.status)
    }

    signData = await signRes.json()
  } finally {
    // If sign failed, release wake lock early
    if (!signData && wakeLockSentinel) {
      wakeLockSentinel.release?.().catch?.(() => {})
    }
  }

  const { localMode, shareHash, files: signedManifests } = signData
  if (!signedManifests || signedManifests.length !== files.length) {
    wakeLockSentinel?.release?.().catch?.(() => {})
    throw new TransferUploadError('Server returned an invalid file upload manifest', 500)
  }

  // Initialize progress trackers
  const fileStatuses: TransferFileProgress[] = files.map((f) => ({
    filename: f.name,
    filesize: f.size,
    loaded: 0,
    percent: 0,
    status: 'pending',
  }))

  const broadcastProgress = () => {
    if (!onProgress) return
    const totalLoaded = fileStatuses.reduce((acc, curr) => acc + curr.loaded, 0)
    const overallPercent = Math.min(Math.round((totalLoaded / totalBatchBytes) * 100), 99)
    onProgress(overallPercent, [...fileStatuses])
  }

  // 3. Binary uploads via direct XHR streams (zero Node server proxying)
  try {
    await Promise.all(
      files.map(async (file, index) => {
        const manifest = signedManifests[index]
        const statusItem = fileStatuses[index]

        statusItem.status = 'uploading'
        broadcastProgress()

        await new Promise<void>((resolve, reject) => {
          if (signal?.aborted) {
            statusItem.status = 'failed'
            return reject(new TransferUploadError('Upload aborted by user'))
          }

          const xhr = new XMLHttpRequest()

          const onAbort = () => {
            xhr.abort()
            statusItem.status = 'failed'
            reject(new TransferUploadError('Upload aborted by user'))
          }

          if (signal) {
            signal.addEventListener('abort', onAbort)
          }

          const cleanup = () => {
            if (signal) {
              signal.removeEventListener('abort', onAbort)
            }
          }

          if (localMode) {
            xhr.open('POST', '/api/transfers/upload-local')
            xhr.setRequestHeader('Content-Type', manifest.mimeType || 'application/octet-stream')
            xhr.setRequestHeader('X-Storage-Path', manifest.storagePath)
          } else {
            xhr.open('PUT', manifest.signedUrl)
            xhr.setRequestHeader('Content-Type', manifest.mimeType || 'application/octet-stream')
          }

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              statusItem.loaded = event.loaded
              statusItem.percent = Math.min(Math.round((event.loaded / event.total) * 100), 99)
              broadcastProgress()
            }
          }

          xhr.onload = () => {
            cleanup()
            if (xhr.status >= 200 && xhr.status < 300) {
              statusItem.loaded = file.size
              statusItem.percent = 100
              statusItem.status = 'complete'
              broadcastProgress()
              resolve()
            } else {
              statusItem.status = 'failed'
              let message = `File "${file.name}" failed with status ${xhr.status}`
              try {
                const parsed = JSON.parse(xhr.responseText)
                if (parsed?.error) message = parsed.error
              } catch {
                /* ignore */
              }
              reject(new TransferUploadError(message, xhr.status))
            }
          }

          xhr.onerror = () => {
            cleanup()
            statusItem.status = 'failed'
            reject(new TransferUploadError(`Network error while uploading "${file.name}"`))
          }

          // Directly stream File object without memory buffer allocations
          xhr.send(file)
        })
      }),
    )
  } finally {
    if (wakeLockSentinel) {
      wakeLockSentinel.release?.().catch?.(() => {})
    }
  }

  if (onProgress) {
    onProgress(100, [...fileStatuses])
  }

  // 4. Register final transfer record via native Payload REST API
  const hasPassword = Boolean(password && password.trim().length > 0)
  const primaryManifest = signedManifests[0]

  const createRes = await fetch('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      shareHash,
      filename: primaryManifest.filename,
      filesize: totalBatchBytes,
      mimeType: primaryManifest.mimeType || 'application/octet-stream',
      storagePath: primaryManifest.storagePath,
      files: signedManifests.map((m: any) => ({
        filename: m.filename,
        filesize: m.filesize,
        mimeType: m.mimeType,
        storagePath: m.storagePath,
      })),
      ...(title?.trim() ? { title: title.trim() } : {}),
      ...(message?.trim() ? { message: message.trim() } : {}),
      ...(hasPassword ? { passwordEnabled: true, _password: password!.trim() } : {}),
      status: 'active',
    }),
    signal,
  })

  if (!createRes.ok) {
    let errorDetail = `Failed to create transfer record (${createRes.status})`
    try {
      const errJson = await createRes.json()
      if (errJson?.errors?.[0]?.message) errorDetail = errJson.errors[0].message
    } catch {
      /* ignore */
    }
    throw new TransferUploadError(errorDetail, createRes.status)
  }

  const record = await createRes.json()
  const doc = record?.doc || record
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicUrl = `${origin}/transfer/${shareHash}`

  return {
    shareHash,
    publicUrl,
    expiresAt: doc.expiresAt,
    transferId: doc.id,
    filename: primaryManifest.filename,
    filesize: totalBatchBytes,
    files: signedManifests.map((m: any) => ({
      filename: m.filename,
      filesize: m.filesize,
      mimeType: m.mimeType,
      storagePath: m.storagePath,
    })),
  }
}

/**
 * Backward-compatible single-file upload wrapper.
 */
export async function uploadTransfer(
  options: TransferUploadOptions,
): Promise<TransferUploadResult> {
  const { file, title, message, password, onProgress, signal } = options

  return uploadTransferBatch({
    files: [file],
    title,
    message,
    password,
    onProgress: (overallPercent) => {
      if (onProgress) onProgress(overallPercent)
    },
    signal,
  })
}
