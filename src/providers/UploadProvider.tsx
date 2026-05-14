'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { IngestionWorkbench } from '@/components/Gallery/IngestionWorkbench'
import { useRouter } from 'next/navigation'
import { revalidateDashboardAction } from '@/app/(dashboard)/actions/media'
import { useAuth } from '@/providers/Auth'

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
  }
}

interface UploadContextType {
  queue: UploadItem[]
  stagedFiles: File[]
  isUploading: boolean
  isWorkbenchOpen: boolean
  addFiles: (files: File[], metadata?: { tags?: string[] }) => void
  commitStagedFiles: (metadata?: { title?: string; location?: string; tags?: string[] }) => void
  clearQueue: () => void
  closeWorkbench: () => void
  cancelUpload: (id: string) => void
  openPicker: () => void
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
      }, 800)
      return () => clearTimeout(timer)
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
    (files: File[], metadata?: { title?: string; location?: string; tags?: string[] }) => {
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
    (metadata?: { title?: string; location?: string; tags?: string[] }) => {
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
      const formData = new FormData()

      // Pack manual tags if present
      const manualTags = nextItem.metadata?.tags?.map((t) => ({ tag: t })) || []

      // Payload 3.0 Best Practice: Pack non-file data into a JSON string
      const payloadData = {
        owner: user?.id,
        title: nextItem.metadata?.title || '',
        alt: nextItem.metadata?.title || nextItem.file.name,
        mediaType: 'image',
        ingestionStatus: 'active',
        manualTags,
        location: {
          address: nextItem.metadata?.location || '',
        },
      }

      formData.append('_payload', JSON.stringify(payloadData))
      formData.append('file', nextItem.file)

      const response = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.errors?.[0]?.message || 'Upload failed')
      }

      setQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id ? { ...item, status: 'ready', progress: 100 } : item,
        ),
      )
    } catch (err) {
      setQueue((prev) =>
        prev.map((item) =>
          item.id === nextItem.id
            ? {
                ...item,
                status: 'failed',
                errorMessage: err instanceof Error ? err.message : 'Unknown error',
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
    </UploadContext.Provider>
  )
}
