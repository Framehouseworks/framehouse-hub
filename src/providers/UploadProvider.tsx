'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { IngestionWorkbench } from '@/components/Gallery/IngestionWorkbench'
import { ArchivalProgressOverlay } from '@/components/Gallery/ArchivalProgressOverlay'
import { useRouter } from 'next/navigation'
import { revalidateDashboardAction } from '@/app/(dashboard)/actions/media'
import { useAuth } from '@/providers/Auth'
import { toast } from 'sonner'

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'failed'

export interface UploadItem {
  id: string
  file: File
  progress: number
  status: UploadStatus
  errorMessage?: string
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
  const { user } = useAuth()

  // 1. Authoritative Completion Observer: Monitors the entire batch for archival success
  useEffect(() => {
    const isFinished =
      queue.length > 0 && queue.every((item) => item.status === 'ready' || item.status === 'failed')
    const hasNewSuccess = queue.some((item) => item.status === 'ready')

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
        const existingFiles = new Set(prev.map((item) => `${item.file.name}-${item.file.size}`))
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
      prev.map((item) =>
        item.status === 'failed' ? { ...item, status: 'pending', progress: 0 } : item,
      ),
    )
  }, [])

  const retryItem = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'pending', progress: 0 } : item)),
    )
  }, [])

  // Sequential Upload Logic
  const processQueue = useCallback(async () => {
    if (isUploading) return

    const nextItem = queue.find((item) => item.status === 'pending')
    if (!nextItem) {
      setIsUploading(false)
      return
    }

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
          filename: nextItem.file.name,
          mimeType: nextItem.file.type,
        }),
      })

      if (!signedUrlResponse.ok) {
        throw new Error('Failed to establish secure upload session signature')
      }

      const uploadSession = await signedUrlResponse.json()

      if (uploadSession.localMode) {
        // --- A. LOCAL FALLBACK INGESTION MODE ---
        const formData = new FormData()
        const manualTags = nextItem.metadata?.tags?.map((t) => ({ tag: t })) || []

        const payloadData = {
          owner: user?.id,
          title: nextItem.metadata?.title || '',
          alt: nextItem.metadata?.title || nextItem.file.name,
          mediaType: 'image',
          ingestionStatus: 'active',
          shootName: nextItem.metadata?.shootName || '',
          manualTags,
          location: {
            address: nextItem.metadata?.location || '',
          },
        }

        formData.append('_payload', JSON.stringify(payloadData))
        formData.append('file', nextItem.file)

        // Perform standard local multipart POST upload with XHR for upload tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', '/api/media')

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
              resolve()
            } else {
              reject(new Error(`Local upload failed with status ${xhr.status}`))
            }
          }

          xhr.onerror = () => reject(new Error('Local network upload error'))
          xhr.send(formData)
        })
      } else {
        // --- B. CLOUD DIRECT GCS INGESTION MODE ---
        const { url, storagePath } = uploadSession

        // Perform direct HTTP PUT binary stream to GCS using raw XHR for real-time progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', url)
          xhr.setRequestHeader('Content-Type', nextItem.file.type)

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
          xhr.send(nextItem.file)
        })

        // Step 2: Register successfully GCS-ingested asset in database
        const registerResponse = await fetch('/api/media/register-gcs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: nextItem.file.name,
            mimeType: nextItem.file.type,
            filesize: nextItem.file.size,
            storagePath,
            title: nextItem.metadata?.title || '',
            shootName: nextItem.metadata?.shootName || '',
            manualTags: nextItem.metadata?.tags?.map((t) => ({ tag: t })) || [],
            location: {
              address: nextItem.metadata?.location || '',
            },
          }),
        })

        if (!registerResponse.ok) {
          const errorData = await registerResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Database registration failed')
        }
      }

      setQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id ? { ...item, status: 'ready', progress: 100 } : item,
        ),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Ingestion Failed [${nextItem.file.name}]: ${message}`)
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
  }, [queue, isUploading, user?.id])

  useEffect(() => {
    if (queue.some((item) => item.status === 'pending') && !isUploading) {
      processQueue()
    }
  }, [queue, isUploading, processQueue])

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
      }}
    >
      {children}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.dng,.arw,.cr2,.nef"
      />
      <IngestionWorkbench />
      <ArchivalProgressOverlay />
    </UploadContext.Provider>
  )
}
