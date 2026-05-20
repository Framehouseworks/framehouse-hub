'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { IngestionWorkbench } from '@/components/Gallery/IngestionWorkbench'
import { ArchivalProgressOverlay } from '@/components/Gallery/ArchivalProgressOverlay'
import { useRouter } from 'next/navigation'
import { revalidateDashboardAction } from '@/app/(dashboard)/actions/media'
import { toast } from 'sonner'

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'failed'

const STAGE_PROGRESS: Record<string, number> = {
  upload_complete: 65,
  exif_parsing: 75,
  generating_webp: 85,
  registering_assets: 95,
  ready: 100,
  failed: 100,
}

export function computeEffectiveProgress(item: UploadItem): number {
  if (item.status === 'ready') return 100
  if (item.status === 'failed') return 100
  if (item.status === 'uploading') return Math.round(item.progress * 0.6)
  if (item.status === 'processing')
    return STAGE_PROGRESS[item.processingStep || 'upload_complete'] || 65
  return 0
}

export interface UploadItem {
  id: string
  file?: File
  filename?: string
  progress: number
  status: UploadStatus
  errorMessage?: string
  mediaId?: string | number
  processingStartedAt?: number
  processingStep?: string
  source?: 'upload' | 'server'
  metadata?: {
    tags?: string[]
    title?: string
    location?: string
    shootName?: string
  }
}

interface UploadContextType {
  queue: UploadItem[]
  stagedFiles: File[]
  isUploading: boolean
  isWorkbenchOpen: boolean
  addFiles: (files: File[], metadata?: { tags?: string[]; shootName?: string }) => void
  commitStagedFiles: (metadata?: {
    title?: string
    location?: string
    tags?: string[]
    shootName?: string
  }) => void
  clearQueue: () => void
  closeWorkbench: () => void
  cancelUpload: (id: string) => void
  openPicker: () => void
  retryFailed: () => void
  retryItem: (id: string) => void
  hydrateServerProcessing: (
    items: { mediaId: string | number; filename: string; processingStep?: string }[],
  ) => void
}

const UploadContext = createContext<UploadContextType | undefined>(undefined)

export const useUpload = () => {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider')
  }
  return context
}

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()

  // 1. Authoritative Completion Observer
  const prevProcessingCountRef = useRef(0)

  useEffect(() => {
    const processingCount = queue.filter((item) => item.status === 'processing').length
    const isFinished =
      queue.length > 0 && queue.every((item) => item.status === 'ready' || item.status === 'failed')
    const hasNewSuccess = queue.some((item) => item.status === 'ready')

    // Refresh grid when new items enter processing (so card appears with badge)
    if (processingCount > prevProcessingCountRef.current) {
      revalidateDashboardAction().then(() => router.refresh())
    }
    prevProcessingCountRef.current = processingCount

    if (isFinished && hasNewSuccess) {
      const timer = setTimeout(async () => {
        await revalidateDashboardAction()
        router.refresh()
        toast.success(
          `Archival Batch Complete: ${queue.filter((i) => i.status === 'ready').length} assets ingested successfully.`,
        )
      }, 800)
      return () => clearTimeout(timer)
    } else if (isFinished && !hasNewSuccess) {
      toast.error('Archival Ingest Failed: No assets were successfully committed.')
    }
  }, [queue, router])

  // Workbench & Picker State
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openPicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const closeWorkbench = useCallback(() => {
    setIsWorkbenchOpen(false)
    setStagedFiles([])
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setStagedFiles(files)
      setIsWorkbenchOpen(true)
    }
    // Clear the input so the same file can be picked again if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addFiles = useCallback(
    (
      files: File[],
      metadata?: { title?: string; location?: string; tags?: string[]; shootName?: string },
    ) => {
      setQueue((prev) => {
        const existingFiles = new Set(
          prev.filter((item) => item.file).map((item) => `${item.file!.name}-${item.file!.size}`),
        )
        const uniqueNewFiles = files.filter((file) => {
          const key = `${file.name}-${file.size}`
          if (existingFiles.has(key)) {
            console.warn(`Duplicate file detected and skipped: ${file.name}`)
            return false
          }
          return true
        })

        const newItems: UploadItem[] = uniqueNewFiles.map((file) => ({
          id: Math.random().toString(36).substr(2, 9),
          file,
          progress: 0,
          status: 'pending',
          metadata,
        }))

        return [...prev, ...newItems]
      })
    },
    [],
  )

  const commitStagedFiles = useCallback(
    (metadata?: { title?: string; location?: string; tags?: string[]; shootName?: string }) => {
      if (stagedFiles.length === 0) return

      addFiles(stagedFiles, metadata)
      closeWorkbench()
    },
    [stagedFiles, addFiles, closeWorkbench],
  )

  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  const cancelUpload = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const retryFailed = useCallback(() => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.status !== 'failed') return item
        if (item.mediaId) {
          // Failed during processing — re-trigger worker, not re-upload
          fetch('/api/media/reprocess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaId: item.mediaId }),
          }).catch(() => {})
          return {
            ...item,
            status: 'processing' as const,
            progress: 100,
            processingStep: 'upload_complete',
            errorMessage: undefined,
          }
        }
        return { ...item, status: 'pending' as const, progress: 0 }
      }),
    )
  }, [])

  const retryItem = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        if (item.mediaId) {
          fetch('/api/media/reprocess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mediaId: item.mediaId }),
          }).catch(() => {})
          return {
            ...item,
            status: 'processing' as const,
            progress: 100,
            processingStep: 'upload_complete',
            errorMessage: undefined,
          }
        }
        return { ...item, status: 'pending' as const, progress: 0 }
      }),
    )
  }, [])

  const hydrateServerProcessing = useCallback(
    (items: { mediaId: string | number; filename: string; processingStep?: string }[]) => {
      setQueue((prev) => {
        const existingMediaIds = new Set(prev.map((q) => String(q.mediaId)).filter(Boolean))
        const newItems: UploadItem[] = items
          .filter((item) => !existingMediaIds.has(String(item.mediaId)))
          .map((item) => ({
            id: `server-${item.mediaId}`,
            filename: item.filename,
            progress: 100,
            status: 'processing' as const,
            mediaId: item.mediaId,
            processingStep: item.processingStep || 'upload_complete',
            source: 'server' as const,
          }))
        if (newItems.length === 0) return prev
        return [...prev, ...newItems]
      })
    },
    [],
  )

  // Sequential Upload Logic
  const processQueue = useCallback(async () => {
    if (isUploading) return

    const nextItem = queue.find((item) => item.status === 'pending')
    if (!nextItem || !nextItem.file) {
      setIsUploading(false)
      return
    }

    const uploadFile = nextItem.file!
    setIsUploading(true)

    // Update status to uploading
    setQueue((prev) =>
      prev.map((item) => (item.id === nextItem.id ? { ...item, status: 'uploading' } : item)),
    )

    try {
      // 1. Fetch Signed Upload Session URL from gateway
      const signedUrlResponse = await fetch('/api/media/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: uploadFile.name,
          mimeType: uploadFile.type,
        }),
      })

      if (!signedUrlResponse.ok) {
        throw new Error('Failed to establish secure upload session signature')
      }

      const uploadSession = await signedUrlResponse.json()

      if (uploadSession.localMode) {
        // --- A. LOCAL INGESTION MODE (mirrors cloud's signed-url +
        // register-gcs shape). The custom endpoint owns the enclave write
        // and the Media doc creation, so we never touch Payload's REST
        // upload pipeline.
        const formData = new FormData()
        const meta = {
          title: nextItem.metadata?.title || '',
          shootName: nextItem.metadata?.shootName || '',
          manualTags: nextItem.metadata?.tags?.map((t) => ({ tag: t })) || [],
          location: { address: nextItem.metadata?.location || '' },
        }
        formData.append('_payload', JSON.stringify(meta))
        formData.append('file', uploadFile)

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', '/api/media/register-local')

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100)
              setQueue((prev) =>
                prev.map((item) =>
                  item.id === nextItem.id ? { ...item, progress: percent } : item,
                ),
              )
            }
          }

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const res = JSON.parse(xhr.responseText)
                const id = res?.media?.id
                if (id) {
                  setQueue((prev) =>
                    prev.map((item) => (item.id === nextItem.id ? { ...item, mediaId: id } : item)),
                  )
                }
              } catch {
                // Response parsing is best-effort
              }
              resolve()
            } else {
              let detail = `status ${xhr.status}`
              try {
                const parsed = JSON.parse(xhr.responseText)
                if (parsed?.error) detail = parsed.error
              } catch {
                /* leave default */
              }
              reject(new Error(`Local upload failed: ${detail}`))
            }
          }

          xhr.onerror = () => reject(new Error('Local network upload error'))
          xhr.send(formData)
        })
      } else {
        // --- B. CLOUD DIRECT GCS INGESTION MODE ---
        // domainCategory is no longer sent to /api/media/register-gcs —
        // the route re-derives it server-side from mimeType+filename and
        // validates the path matches. signed-url remains the single
        // server-side authority on the storagePath value.
        const { url, storagePath } = uploadSession

        // Perform direct HTTP PUT binary stream to GCS using raw XHR for real-time progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', url)
          xhr.setRequestHeader('Content-Type', uploadFile.type)

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100)
              setQueue((prev) =>
                prev.map((item) =>
                  item.id === nextItem.id ? { ...item, progress: percent } : item,
                ),
              )
            }
          }

          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve()
            } else {
              reject(new Error(`GCS upload failed with status ${xhr.status}`))
            }
          }

          xhr.onerror = () => reject(new Error('Cloud Network Direct Upload failed'))
          xhr.send(uploadFile)
        })

        // Step 2: Register successfully GCS-ingested asset in database
        const registerResponse = await fetch('/api/media/register-gcs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: uploadFile.name,
            mimeType: uploadFile.type,
            filesize: uploadFile.size,
            storagePath,
            title: nextItem.metadata?.title || '',
            shootName: nextItem.metadata?.shootName || '',
            manualTags: nextItem.metadata?.tags?.map((t) => ({ tag: t })) || [],
            location: {
              address: nextItem.metadata?.location || '',
            },
          }),
        })

        const registerData = await registerResponse.json().catch(() => ({}))

        if (!registerResponse.ok) {
          throw new Error(registerData.error || 'Database registration failed')
        }

        if (registerData?.media?.id) {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === nextItem.id ? { ...item, mediaId: registerData.media.id } : item,
            ),
          )
        }
      }

      setQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id
            ? { ...item, status: 'processing', progress: 100, processingStartedAt: Date.now() }
            : item,
        ),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Ingestion Failed [${uploadFile.name}]: ${message}`)
      setQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id
            ? {
                ...item,
                status: 'failed',
                errorMessage: message,
              }
            : item,
        ),
      )
    } finally {
      setIsUploading(false)
    }
  }, [queue, isUploading])

  useEffect(() => {
    if (queue.some((item) => item.status === 'pending') && !isUploading) {
      processQueue()
    }
  }, [queue, isUploading, processQueue])

  // Processing Tracker: single unfiltered SSE connection, filter client-side.
  // Open when any items are processing, close when none remain.
  const sseRef = useRef<EventSource | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasProcessingRef = useRef(false)

  const handleProcessingEvent = useCallback(
    (data: {
      mediaId: string
      ingestionStatus: string
      processingStep?: string
      errorMessage?: string
    }) => {
      setQueue((prev) => {
        let changed = false
        const next = prev.map((q) => {
          if (String(q.mediaId) !== String(data.mediaId)) return q
          changed = true
          if (data.ingestionStatus === 'ready')
            return { ...q, status: 'ready' as const, processingStep: 'ready' }
          if (data.ingestionStatus === 'failed')
            return {
              ...q,
              status: 'failed' as const,
              processingStep: 'failed',
              errorMessage: data.errorMessage || 'Processing failed',
            }
          return { ...q, processingStep: data.processingStep }
        })
        return changed ? next : prev
      })
    },
    [],
  )

  // Stabilise the effect dep on just the set of processing mediaIds so
  // unrelated queue churn (upload progress %) doesn't tear down the SSE.
  const processingIdsKey = useMemo(
    () =>
      Array.from(
        new Set(
          queue.filter((q) => q.status === 'processing' && q.mediaId).map((q) => String(q.mediaId)),
        ),
      )
        .sort()
        .join(','),
    [queue],
  )

  // Hold a ref to the latest queue so the polling closure can read it
  // without re-subscribing every render.
  const queueRef = useRef(queue)
  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  useEffect(() => {
    const hasProcessing = processingIdsKey.length > 0

    if (!hasProcessing) {
      if (sseRef.current) {
        sseRef.current.close()
        sseRef.current = null
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      hasProcessingRef.current = false
      return
    }

    // Already connected — nothing to do
    if (hasProcessingRef.current && sseRef.current) return
    hasProcessingRef.current = true

    // Open a single unfiltered SSE stream — client filters by mediaId.
    // SSE delivers near-instant updates when the worker callback's emit
    // reaches the in-process bus.
    const eventSource = new EventSource('/api/media/status-stream?mediaIds=')
    sseRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.mediaId) handleProcessingEvent(data)
      } catch {
        /* malformed */
      }
    }

    eventSource.onerror = () => {
      // Close the stream but keep the polling backstop running. SSE may
      // reopen on the next processing item; if not, polling is sufficient.
      eventSource.close()
      sseRef.current = null
    }

    // Always-on polling backstop. Even when SSE is healthy this handles the
    // silent-stream case (events emitted on a different module instance
    // than the stream subscribed to). Cheap GETs against /api/media/{id}
    // every 3s while items are in flight.
    const pollOnce = async () => {
      const ids = Array.from(
        new Set(
          queueRef.current
            .filter((q) => q.status === 'processing' && q.mediaId)
            .map((q) => String(q.mediaId)),
        ),
      )
      for (const id of ids) {
        try {
          const res = await fetch(`/api/media/${id}`, { cache: 'no-store' })
          if (!res.ok) continue
          const doc = await res.json()
          handleProcessingEvent({
            mediaId: id,
            ingestionStatus: doc?.ingestionStatus,
            processingStep: doc?.processingStep,
            errorMessage: doc?.errorMessage,
          })
        } catch {
          /* transient */
        }
      }
    }
    // Kick once immediately so newly-registered items get their current
    // server state without waiting a full interval.
    void pollOnce()
    pollingRef.current = setInterval(pollOnce, 3000)

    return () => {
      eventSource.close()
      sseRef.current = null
      hasProcessingRef.current = false
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [processingIdsKey, handleProcessingEvent])

  // Warning on page leave
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (queue.some((item) => item.status === 'uploading' || item.status === 'pending')) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [queue])

  return (
    <UploadContext.Provider
      value={{
        queue,
        stagedFiles,
        isUploading,
        isWorkbenchOpen,
        addFiles,
        commitStagedFiles,
        clearQueue,
        closeWorkbench,
        cancelUpload,
        openPicker,
        retryFailed,
        retryItem,
        hydrateServerProcessing,
      }}
    >
      {children}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,audio/*,.dng,.arw,.cr2,.nef,.pdf,.json,.csv,.md"
      />
      <IngestionWorkbench />
      <ArchivalProgressOverlay />
    </UploadContext.Provider>
  )
}
