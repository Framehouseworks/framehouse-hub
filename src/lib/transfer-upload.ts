/**
 * Transfer Upload Service (FRH-67 Phase 2)
 *
 * Unified client-side upload pipeline for Link Transfers.
 * - Enforces pre-flight 250MB limit check
 * - Requests signed PUT URL (or local mode flag)
 * - Streams binary bytes directly via XHR with progress tracking
 * - Registers final document via native Payload REST API
 */

export const MAX_TRANSFER_BYTES = 250 * 1024 * 1024 // 250MB

export interface TransferUploadOptions {
  file: File
  title?: string
  message?: string
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

export interface TransferUploadResult {
  shareHash: string
  publicUrl: string
  expiresAt: string
  transferId: number
  filename: string
  filesize: number
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

export async function uploadTransfer(
  options: TransferUploadOptions,
): Promise<TransferUploadResult> {
  const { file, title, message, onProgress, signal } = options

  // 1. Client-side pre-flight size enforcement
  if (!file) {
    throw new TransferUploadError('No file provided')
  }

  if (file.size <= 0) {
    throw new TransferUploadError(
      'This file appears to be empty (0 bytes). Please select a file with content to transfer.',
    )
  }

  if (file.size > MAX_TRANSFER_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    throw new TransferUploadError(
      `This file is ${sizeMB}MB, which exceeds our 250MB transfer limit. Please choose a file under 250MB.`,
      413,
    )
  }

  // 2. Request signed upload signature / local mode token
  const signRes = await fetch('/api/transfers/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      filename: file.name,
      filesize: file.size,
      mimeType: file.type || 'application/octet-stream',
    }),
    signal,
  })

  if (!signRes.ok) {
    let errorDetail = `Failed with status ${signRes.status}`
    try {
      const errJson = await signRes.json()
      if (errJson?.error) errorDetail = errJson.error
    } catch {
      /* ignore */
    }
    throw new TransferUploadError(errorDetail, signRes.status)
  }

  const signData = await signRes.json()
  const { localMode, signedUrl, shareHash, storagePath, mimeType: effectiveMimeType } = signData

  // 3. Binary upload via XHR for real-time progress
  await new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new TransferUploadError('Upload aborted by user'))
    }

    const xhr = new XMLHttpRequest()

    const onAbort = () => {
      xhr.abort()
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
      // Local dev mode: stream raw bytes to upload-local endpoint
      xhr.open('POST', '/api/transfers/upload-local')
      xhr.setRequestHeader('Content-Type', effectiveMimeType || 'application/octet-stream')
      xhr.setRequestHeader('X-Storage-Path', storagePath)
    } else {
      // Cloud mode: direct HTTP PUT to GCS signed URL
      xhr.open('PUT', signedUrl)
      xhr.setRequestHeader('Content-Type', effectiveMimeType || 'application/octet-stream')
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.min(Math.round((event.loaded / event.total) * 100), 99)
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      cleanup()
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100)
        resolve()
      } else {
        let message = `Upload failed with status ${xhr.status}`
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
      reject(new TransferUploadError('Network error during file upload'))
    }

    xhr.send(file)
  })

  // 4. Register transfer record via native Payload REST API
  const createRes = await fetch('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      shareHash,
      filename: file.name,
      filesize: file.size,
      mimeType: effectiveMimeType || 'application/octet-stream',
      storagePath,
      ...(title?.trim() ? { title: title.trim() } : {}),
      ...(message?.trim() ? { message: message.trim() } : {}),
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
    filename: file.name,
    filesize: file.size,
  }
}
