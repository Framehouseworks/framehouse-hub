'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { UploadModal } from '@/components/Gallery/UploadModal'

export type UploadStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'failed'

export interface UploadItem {
  id: string
  file: File
  progress: number
  status: UploadStatus
  errorMessage?: string
}

interface UploadContextType {
  queue: UploadItem[]
  isUploading: boolean
  addFiles: (files: File[]) => void
  clearQueue: () => void
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

  // Modal & Picker State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openPicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setStagedFiles(files)
      setIsModalOpen(true)
    }
    // Clear the input so the same file can be picked again if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadItem[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'pending',
    }))
    setQueue((prev) => [...prev, ...newItems])
  }, [])

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

      // Payload 3.0 Best Practice: Pack non-file data into a JSON string
      const payloadData = {
        alt: nextItem.file.name,
        mediaType: 'image',
        ingestionStatus: 'active',
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
  }, [queue, isUploading])

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
      value={{ queue, isUploading, addFiles, clearQueue, cancelUpload, openPicker }}
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
      <UploadModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} files={stagedFiles} />
    </UploadContext.Provider>
  )
}
