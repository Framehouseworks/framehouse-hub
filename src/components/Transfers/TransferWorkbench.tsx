'use client'

/**
 * TransferWorkbench.tsx — Link Transfer Sender Interface (FRH-67 Phase 3)
 *
 * Sender Requirements & Account Setup:
 * - Requires an authenticated user with active 'creative' or 'admin' role.
 * - Viewers/guests cannot generate transfers (enforced via access control & endpoints).
 *
 * Client User Journey:
 * 1. Sender drags deliverable (<250MB) into the Curated Gallery workbench.
 * 2. Clicks "Get a link" -> client pre-flights size and initiates XHR direct upload.
 * 3. Share URL auto-copies to clipboard with Safari-resilient fallback.
 * 4. Recipient opens link -> instant zero-login download with 3-day retention.
 */

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { MAX_TRANSFER_BYTES, TransferUploadResult, uploadTransfer } from '@/lib/transfer-upload'
import type { Transfer } from '@/payload-types'
import { cn } from '@/utilities/cn'
import {
  Check,
  Clock,
  CloudUpload,
  Copy,
  ExternalLink,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  File as GenericFile,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / 1024 ** i
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`
}

function getFileIcon(filename: string, mimeType: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['zip', 'rar', '7z', 'tar', 'gz', 'dmg'].includes(ext)) return FileArchive
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'raw', 'dng'].includes(ext))
    return FileImage
  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(ext))
    return FileVideo
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'aac', 'flac', 'm4a'].includes(ext))
    return FileAudio
  if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext)) return FileText
  return GenericFile
}

function formatCountdown(expiresAt: string, status?: string | null): { label: string; isExpired: boolean } {
  if (status === 'revoked') return { label: 'Revoked by sender', isExpired: true }
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs <= 0) return { label: 'Expired (3-day limit)', isExpired: true }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  const dateStr = new Date(expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  if (days > 0) {
    return { label: `${days}d ${hours}h left • Expires ${dateStr}`, isExpired: false }
  }
  if (hours > 0) {
    return { label: `${hours}h ${minutes}m left • Expires ${dateStr}`, isExpired: false }
  }
  return { label: `${minutes}m left • Expires ${dateStr}`, isExpired: false }
}

interface TransferWorkbenchProps {
  initialTransfers?: Transfer[]
}

type WorkbenchState = 'IDLE' | 'STAGED' | 'UPLOADING' | 'READY'

export function TransferWorkbench({ initialTransfers = [] }: TransferWorkbenchProps) {
  const [state, setState] = useState<WorkbenchState>('IDLE')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<TransferUploadResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Pre-flight file validation adhering to AC-1
  const stageFile = useCallback((selectedFile: File) => {
    if (!selectedFile) return

    if (selectedFile.size > MAX_TRANSFER_BYTES) {
      const fileSizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1)
      toast.error(
        `This file is ${fileSizeMB}MB, which exceeds our 250MB transfer limit. Please choose a file under 250MB.`,
      )
      return
    }

    if (selectedFile.size <= 0) {
      toast.error(
        'This file appears to be empty (0 bytes). Please select a file with content to transfer.',
      )
      return
    }

    setFile(selectedFile)
    setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
    setMessage('')
    setState('STAGED')
  }, [])

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) stageFile(droppedFile)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosenFile = e.target.files?.[0]
    if (chosenFile) stageFile(chosenFile)
    if (e.target) e.target.value = ''
  }

  // Upload trigger with real-time XHR progress & clipboard resolution
  const handleStartUpload = async () => {
    if (!file) return

    const controller = new AbortController()
    abortControllerRef.current = controller

    setState('UPLOADING')
    setProgress(0)

    try {
      const uploadRes = await uploadTransfer({
        file,
        title: title.trim() || undefined,
        message: message.trim() || undefined,
        onProgress: (pct) => setProgress(pct),
        signal: controller.signal,
      })

      setResult(uploadRes)
      setState('READY')

      // Prepend to local transfers list for immediate feedback
      setTransfers((prev) => [
        {
          id: uploadRes.transferId,
          shareHash: uploadRes.shareHash,
          filename: uploadRes.filename,
          filesize: uploadRes.filesize,
          mimeType: file.type || 'application/octet-stream',
          storagePath: '',
          title: title.trim() || null,
          message: message.trim() || null,
          status: 'active',
          expiresAt: uploadRes.expiresAt,
          downloadCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sender: 0,
        } as Transfer,
        ...prev,
      ])

      // Resilient clipboard handler (Issue 8: Safari gesture expiration fallback)
      try {
        await navigator.clipboard.writeText(uploadRes.publicUrl)
        setCopied(true)
        toast.success('Link ready and copied to clipboard!')
        setTimeout(() => setCopied(false), 3000)
      } catch {
        // Fallback for Safari when user gesture expires during long upload
        toast.info('Link ready! Click Copy to share.')
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        toast.info('Transfer cancelled')
        setState('STAGED')
        return
      }
      const message = err instanceof Error ? err.message : 'Transfer upload failed'
      toast.error(message)
      setState('STAGED')
    } finally {
      abortControllerRef.current = null
    }
  }

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  const handleManualCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Failed to copy. Please copy manually.')
    }
  }

  const handleReset = () => {
    setFile(null)
    setTitle('')
    setMessage('')
    setProgress(0)
    setResult(null)
    setState('IDLE')
  }

  const handleDeleteTransfer = async (id: number) => {
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        setTransfers((prev) => prev.filter((t) => t.id !== id))
        toast.success('Transfer deleted and storage cleaned up.')
      } else {
        toast.error('Failed to delete transfer.')
      }
    } catch {
      toast.error('Network error deleting transfer.')
    }
  }

  const FileIcon = file ? getFileIcon(file.name, file.type) : GenericFile

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-rubik text-[10px] tracking-[0.22em] text-gallery-gold uppercase px-2 py-0.5 rounded-full bg-gallery-gold/10">
            Workspace
          </span>
          <span className="text-on-surface/30 text-xs">•</span>
          <span className="font-rubik text-[10px] tracking-[0.18em] text-on-surface/40 uppercase">
            Send Files
          </span>
        </div>
        <h1 className="font-varela text-3xl sm:text-4xl tracking-tight text-primary">
          File Transfers
        </h1>
        <p className="text-sm text-on-surface/60 max-w-xl">
          Move your biggest ideas without the heavy lifting.
        </p>
      </div>

      {/* ── Main Curated Stage Card ─────────────────────────────────────── */}
      <div className="relative rounded-[28px] bg-white/70 dark:bg-white/[0.03] backdrop-blur-xl p-6 sm:p-10 shadow-[0px_20px_48px_rgba(26,28,28,0.06)]">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          aria-label="Select file for transfer"
        />

        {/* ── STATE 1: IDLE DROPZONE ────────────────────────────────────── */}
        {state === 'IDLE' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            className={cn(
              'group cursor-pointer rounded-3xl p-8 sm:p-14 text-center transition-all duration-300',
              isDragging
              && 'ring-2 ring-gallery-gold bg-gallery-gold/5 scale-[0.99]'
            )}
          >
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-gallery-gold/10 text-gallery-gold flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <CloudUpload size={32} strokeWidth={1.75} />
              </div>

              <div className="space-y-1.5">
                <p className="font-semibold text-lg text-primary">
                  Drag & drop your file here, or{' '}
                  <span className="text-gallery-gold hover:underline">browse</span>
                </p>
                <p className="text-xs text-on-surface/50">
                  Deliver standalone assets, master archives, or cutdowns up to 250MB
                </p>
              </div>

              {/* Tonal Policy Badges in Rubik Mono One */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 uppercase">
                <span className="font-rubik text-[9.5px] tracking-wider px-3 py-1 rounded-full bg-black/5 dark:bg-white/10 text-on-surface/60">
                  250MB Max Limit
                </span>
                <span className="font-rubik text-[9.5px] tracking-wider px-3 py-1 rounded-full bg-gallery-gold/10 text-gallery-gold">
                  3 Days Retention
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── STATE 2: STAGED FOR UPLOAD ────────────────────────────────── */}
        {state === 'STAGED' && file && (
          <div className="space-y-8">
            {/* File item preview card */}
            <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-gallery-surface">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-gallery-gold/15 text-gallery-gold flex items-center justify-center">
                  <FileIcon size={24} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary truncate max-w-sm sm:max-w-md">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-rubik text-[10px] text-on-surface/50">
                      {formatBytes(file.size)}
                    </span>
                    <span className="text-on-surface/20 text-xs">•</span>
                    <span className="font-rubik text-[9px] uppercase px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-on-surface/60">
                      {file.name.split('.').pop() || 'FILE'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleReset}
                aria-label="Remove staged file"
                className="w-8 h-8 rounded-full bg-on-surface/5 hover:bg-on-surface/10 text-on-surface/50 hover:text-on-surface flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Optional Metadata Inputs */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="transfer-title"
                  className="block font-rubik text-[9.5px] tracking-[0.18em] text-on-surface/40 uppercase mb-2"
                >
                  Transfer Title (Optional)
                </label>
                <Input
                  id="transfer-title"
                  placeholder="e.g. Campaign Rough Cut Deliverable"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-12 rounded-2xl bg-gallery-surface border-0 focus-visible:ring-2 focus-visible:ring-gallery-gold text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="transfer-message"
                  className="block font-rubik text-[9.5px] tracking-[0.18em] text-on-surface/40 uppercase mb-2"
                >
                  Note for Recipient (Optional)
                </label>
                <textarea
                  id="transfer-message"
                  rows={3}
                  placeholder="Add context or viewing instructions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full resize-none rounded-2xl bg-gallery-surface px-4 py-3 text-sm text-on-surface placeholder:text-on-surface/40 focus:outline-none focus:ring-2 focus:ring-gallery-gold"
                />
              </div>
            </div>

            {/* Call To Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Button
                variant="gallery"
                size="lg"
                onClick={handleStartUpload}
                className="w-full sm:flex-1 h-13 gap-2.5 rounded-2xl bg-linear-to-r from-[#7f5700] to-[#d79922] text-white hover:opacity-90 shadow-[0_12px_32px_rgba(215,153,34,0.25)] font-inter text-base font-semibold tracking-tight transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <SendHorizontal size={18} />
                Get a link
              </Button>
            </div>
          </div>
        )}

        {/* ── STATE 3: UPLOADING VIA XHR ────────────────────────────────── */}
        {state === 'UPLOADING' && file && (
          <div className="py-8 space-y-6 text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-primary truncate max-w-xs">{file.name}</span>
              <span className="font-rubik text-gallery-gold text-sm">{progress}%</span>
            </div>

            <Progress value={progress} className="h-3 bg-black/5 dark:bg-white/10" />

            <div className="flex items-center justify-between text-[11px] text-on-surface/40">
              <span>We're uploading your file now...</span>
              <span className="font-rubik">{formatBytes((file.size * progress) / 100)} of {formatBytes(file.size)}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelUpload}
              className="rounded-full px-5 text-xs text-on-surface/60 hover:text-gallery-red"
            >
              Cancel upload
            </Button>
          </div>
        )}

        {/* ── STATE 4: LINK READY & COPIED ──────────────────────────────── */}
        {state === 'READY' && result && (
          <div className="space-y-8 py-2">
            <div className="flex items-center gap-3 text-gallery-gold">
              <div className="w-10 h-10 rounded-full bg-gallery-gold/15 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-lg text-primary">Your link is ready!</h2>
                <p className="text-xs text-on-surface/50">
                  Anyone with this link can instantly download the deliverable.
                </p>
              </div>
            </div>

            {/* Share link input with direct copy */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={result.publicUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="h-13 rounded-2xl bg-gallery-surface pr-10 font-mono text-xs text-primary border-0 focus-visible:ring-2 focus-visible:ring-gallery-gold"
                />
              </div>
              <Button
                variant="gallery"
                size="lg"
                onClick={() => handleManualCopy(result.publicUrl)}
                className="h-13 px-6 gap-2 shrink-0 font-medium"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>

            {/* Expiration and Details Pill Row */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-gallery-surface text-xs text-on-surface/60">
              <div className="flex items-center gap-1.5 font-rubik text-[10px] text-gallery-gold">
                <Clock size={13} />
                <span>EXPIRES IN 3 DAYS (72 HOURS)</span>
              </div>
              <span className="text-on-surface/20">•</span>
              <span className="font-rubik text-[10px]">{formatBytes(result.filesize)}</span>
              <span className="text-on-surface/20">•</span>
              <span className="truncate max-w-xs">{result.filename}</span>
            </div>

            {/* Reset / Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={handleReset}
                className="w-full sm:w-auto gap-2 rounded-[24px] text-on-surface/60 hover:text-primary"
              >
                <RotateCcw size={16} />
                Send another file
              </Button>

              <a
                href={result.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-gallery-gold hover:underline font-medium"
              >
                <span>Preview recipient page</span>
                <ExternalLink size={13} />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Recent Transfers Ledger (Curated Tonal Table) ────────────────── */}
      {transfers.length > 0 && (
        <div className="space-y-4 ">
          <div className="flex items-center justify-between px-2">
            <h2 className="font-rubik text-[10px] tracking-[0.2em] text-on-surface/40 uppercase">
              Recent Transfers
            </h2>
            <span className="font-rubik text-[10px] text-on-surface/30 uppercase">
              {transfers.length} {transfers.length === 1 ? 'File' : 'Files'}
            </span>
          </div>

          <div className="relative rounded-[28px] p-4 bg-white/70 dark:bg-white/3 backdrop-blur-xl shadow-[0px_20px_48px_rgba(26,28,28,0.06)] overflow-hidden">
            <div className="flex flex-col gap-y-4">
              {transfers.slice(0, 10).map((t) => {
                const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/transfer/${t.shareHash}`
                const countdown = formatCountdown(t.expiresAt, t.status)
                const isInactive = countdown.isExpired

                return (
                  <div
                    key={t.id}
                    data-testid="transfer-row"
                    className="rounded-[28px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gallery-surface/60 hover:bg-gallery-surface/90 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-gallery-gold/10 text-gallery-gold flex items-center justify-center">
                        <GenericFile size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-primary truncate max-w-sm">
                          {t.title || t.filename}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-on-surface/40 font-rubik text-[10px] flex-wrap">
                          <span>{formatBytes(t.filesize)}</span>
                          <span>•</span>
                          <span>{t.downloadCount || 0} downloads</span>
                          <span>•</span>
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full',
                              isInactive
                                ? 'bg-gallery-red/10 text-gallery-red font-medium'
                                : 'bg-gallery-gold/10 text-gallery-gold',
                            )}
                          >
                            {countdown.label.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isInactive}
                        onClick={() => handleManualCopy(fullUrl)}
                        className="rounded-full gap-1.5 text-xs text-on-surface/60 hover:bg-gallery-gold/5 hover:text-gallery-gold"
                      >
                        <Copy size={13} />
                        <span>Copy</span>
                      </Button>
                      <a
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'w-8 h-8 rounded-full bg-on-surface/5 hover:bg-on-surface/10 text-on-surface/60 hover:text-primary flex items-center justify-center transition-colors',
                          isInactive && 'opacity-40 pointer-events-none',
                        )}
                        aria-label="Open transfer link"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTransfer(t.id)}
                        title="Delete transfer and file bytes"
                        className="rounded-full gap-1 text-xs text-on-surface/50 hover:text-gallery-red hover:bg-gallery-red/10"
                      >
                        <Trash2 size={13} />
                        <span className="hidden md:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
