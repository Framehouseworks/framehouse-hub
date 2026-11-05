'use client'

/**
 * TransferDownloadView.tsx — Public Recipient Download Experience (FRH-67)
 *
 * Design System: "The Curated Gallery" (DESIGN.md)
 * - Tonal layering, pure white / ambient canvas, no 1px solid section borders
 * - Metadata chips in Rubik Mono One
 * - Invisible iframe for instant unauthenticated auto-download dispatch
 * - Resilient manual fallback CTA
 */

import { LogoIcon } from '@/components/Logo/LogoIcon'
import { Button } from '@/components/ui/button'
import type { Transfer, User, TransferWallpaper } from '@/payload-types'
import {
  TransferWallpaperCanvas,
  TransferWallpaperCreditBadge,
  FALLBACK_TRANSFER_WALLPAPER,
} from '@/components/Transfers/TransferWallpaperCanvas'
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Download,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  File as GenericFile,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TransferMediaPreview, type TransferPreviewResponse } from '@/components/Transfers/Preview'
import { Input } from '@/components/ui/input'
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

function formatCountdown(expiresAt: string): { label: string; isExpired: boolean } {
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  if (diffMs <= 0) return { label: 'Expired', isExpired: true }

  const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return { label: `Expires in about ${days}d ${hours}h`, isExpired: false }
  }
  if (hours > 0) {
    return { label: `Expires in about ${hours}h ${minutes}m`, isExpired: false }
  }
  return { label: `Expires in about ${minutes}m`, isExpired: false }
}

export type TransferStatus = 'active' | 'revoked' | 'expired' | 'not_found'

interface TransferDownloadViewProps {
  transfer: Transfer | null
  status?: TransferStatus
  /** Backwards-compatible flag */
  expired?: boolean
  /** Active transfer wallpapers for background canvas */
  wallpapers?: TransferWallpaper[]
  /** Whether the transfer is locked behind a password */
  passwordProtected?: boolean
  /** Share hash used for verifying password and loading transfer */
  shareHash?: string
}

export function TransferDownloadView({
  transfer: initialTransfer,
  status,
  expired = false,
  wallpapers = [],
  passwordProtected = false,
  shareHash,
}: TransferDownloadViewProps) {
  const [transfer, setTransfer] = useState<Transfer | null>(initialTransfer)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isUnlocked, setIsUnlocked] = useState(!passwordProtected || Boolean(initialTransfer))
  const [passwordInput, setPasswordInput] = useState('')
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isDownloadingBlob, setIsDownloadingBlob] = useState(false)

  const [hasClickedDownload, setHasClickedDownload] = useState(false)
  const [activeWallpaper, setActiveWallpaper] = useState<TransferWallpaper>(
    wallpapers[0] || FALLBACK_TRANSFER_WALLPAPER,
  )

  const activeShareHash = shareHash || transfer?.shareHash || ''

  // Password verification submission
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput.trim() || isVerifyingPassword) return

    setIsVerifyingPassword(true)
    setPasswordError(null)

    try {
      const verifyRes = await fetch(`/api/transfers/${activeShareHash}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() }),
      })

      if (verifyRes.status === 429) {
        const retryAfter = verifyRes.headers.get('Retry-After') || '300'
        setPasswordError(`Too many attempts. Please try again in ${Math.ceil(Number(retryAfter) / 60)} minutes.`)
        return
      }

      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}))
        setPasswordError(data.error || 'Incorrect password')
        return
      }

      const { token } = await verifyRes.json()
      setAuthToken(token)

      // Fetch transfer metadata with the auth token
      const metaRes = await fetch(`/api/transfers?where[shareHash][equals]=${encodeURIComponent(activeShareHash)}&depth=1`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!metaRes.ok) {
        setPasswordError('Failed to load transfer metadata.')
        return
      }

      const metaData = await metaRes.json()
      const doc = metaData.docs?.[0] as Transfer | undefined

      if (doc) {
        setTransfer(doc)
        setIsUnlocked(true)
      } else {
        setPasswordError('Transfer not found.')
      }
    } catch {
      setPasswordError('Network error during authentication.')
    } finally {
      setIsVerifyingPassword(false)
    }
  }

  // Preview state management (FRH-82)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [previewData, setPreviewData] = useState<TransferPreviewResponse | null>(null)

  const fetchPreview = useCallback(async () => {
    const targetHash = transfer?.shareHash || activeShareHash
    if (!targetHash) return
    setIsPreviewLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`
      }
      const res = await fetch(`/api/transfers/${targetHash}/preview`, { headers })
      if (!res.ok) {
        if (res.status === 401) {
          toast.error('Session expired. Please re-authenticate.')
          setIsUnlocked(false)
        }
        setPreviewData(null)
      } else {
        const data: TransferPreviewResponse = await res.json()
        setPreviewData(data)
      }
    } catch {
      setPreviewData(null)
    } finally {
      setIsPreviewLoading(false)
    }
  }, [transfer, activeShareHash, authToken])

  const togglePreview = useCallback(() => {
    if (!isPreviewOpen && !previewData && !isPreviewLoading) {
      fetchPreview()
    }
    setIsPreviewOpen((prev) => !prev)
  }, [isPreviewOpen, previewData, isPreviewLoading, fetchPreview])

  // Secure download trigger using fetch + blob for token-guarded transfers
  const handleSecureDownload = async () => {
    if (!transfer) return
    setHasClickedDownload(true)

    if (!authToken) {
      // Unprotected transfer: standard link navigation
      const link = document.createElement('a')
      link.href = `/api/transfers/${transfer.shareHash}/download`
      link.download = transfer.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    setIsDownloadingBlob(true)
    try {
      const res = await fetch(`/api/transfers/${transfer.shareHash}/download`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      if (res.status === 401) {
        toast.error('Session expired. Please re-authenticate.')
        setIsUnlocked(false)
        return
      }

      if (!res.ok) {
        toast.error('Download failed. Please try again.')
        return
      }

      // If GCS redirected or returned blob stream directly
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = transfer.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch {
      toast.error('Network error during download.')
    } finally {
      setIsDownloadingBlob(false)
    }
  }

  // Resolve fine-grained status
  const effectiveStatus: TransferStatus =
    status ||
    (!transfer
      ? 'not_found'
      : transfer.status === 'revoked'
        ? 'revoked'
        : expired || new Date(transfer.expiresAt).getTime() <= Date.now()
          ? 'expired'
          : 'active')

  const isAvailable = effectiveStatus === 'active' && Boolean(transfer)

  const downloadUrl = transfer ? `/api/transfers/${transfer.shareHash}/download` : ''

  const sender = transfer?.sender as User | undefined
  const senderName =
    transfer && typeof transfer.sender === 'object' && transfer.sender
      ? sender?.name || sender?.studioName || sender?.email?.split('@')[0] || 'A creative collaborator'
      : 'A creative collaborator'

  // ── PASSWORD AUTHENTICATION GATE SCREEN (FRH-70) ────────────────────────
  if (passwordProtected && !isUnlocked) {
    return (
      <main className="bleed-header min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-8 overflow-x-hidden">
        {/* Layer 0 & 1: Transfer Background Canvas & Ambient Contrast Scrim */}
        <TransferWallpaperCanvas
          wallpapers={wallpapers}
          onWallpaperChange={setActiveWallpaper}
        />

        <div className="w-full max-w-md mx-auto text-center space-y-6 relative z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <LogoIcon size={36} />
            <span className="font-varela text-xl tracking-tight text-white dark:text-primary drop-shadow-sm">
              Hub Archive
            </span>
          </div>

          <div className="rounded-[28px] bg-white/90 dark:bg-zinc-950/85 backdrop-blur-2xl p-8 sm:p-10 shadow-[0px_20px_48px_rgba(0,0,0,0.18)] border border-white/20 dark:border-white/10 space-y-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-gallery-gold/15 text-gallery-gold flex items-center justify-center">
              <Lock size={26} />
            </div>

            <div className="space-y-2">
              <span className="font-rubik text-[9.5px] tracking-[0.2em] text-gallery-gold uppercase px-2.5 py-1 rounded-full bg-gallery-gold/10">
                Password Protected
              </span>
              <h1 className="font-varela text-2xl tracking-tight text-primary pt-2">
                Protected Transfer
              </h1>
              <p className="text-xs text-on-surface/50 leading-relaxed max-w-xs mx-auto">
                This deliverable is locked. Enter the transfer password set by the sender to access the files.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4 pt-2">
              <div className="space-y-1.5 text-left">
                <Input
                  type="password"
                  placeholder="Enter transfer password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value)
                    if (passwordError) setPasswordError(null)
                  }}
                  disabled={isVerifyingPassword}
                  className="h-12 rounded-2xl bg-gallery-surface text-center font-geist text-sm border-0 focus-visible:ring-2 focus-visible:ring-gallery-gold"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-xs text-gallery-red text-center font-medium mt-1">
                    {passwordError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="gallery"
                disabled={!passwordInput.trim() || isVerifyingPassword}
                className="w-full h-12 gap-2 text-sm font-semibold shadow-[0px_8px_20px_rgba(127,87,0,0.25)]"
              >
                <Lock size={16} />
                {isVerifyingPassword ? 'Unlocking...' : 'Unlock Transfer'}
              </Button>
            </form>
          </div>

          <p className="font-rubik text-[9.5px] tracking-[0.18em] text-white/50 dark:text-on-surface/30 uppercase drop-shadow-xs">
            Protected by Framehouse Hub Transfer
          </p>
        </div>

        {/* Layer 3: Credit Badge (Positioned inside transfer parent) */}
        <div className="absolute bottom-4 left-4 z-20">
          <TransferWallpaperCreditBadge wallpaper={activeWallpaper} />
        </div>
      </main>
    )
  }

  // ── EXPIRED, REVOKED, OR NOT FOUND CARD ──────────────────────────────────
  if (!isAvailable || !transfer) {
    let statusBadge = 'Transfer Expired'
    let statusTitle = 'This transfer has expired'
    let statusDesc =
      'Links are strictly retained for 3 days (72 hours) to maintain storage hygiene. Please request a new transfer link from the sender.'

    if (effectiveStatus === 'revoked') {
      statusBadge = 'Transfer Revoked'
      statusTitle = 'This transfer link was revoked'
      statusDesc =
        'The sender has manually revoked this transfer link. Please contact the sender if you require this deliverable.'
    } else if (effectiveStatus === 'not_found') {
      statusBadge = 'Transfer Not Found'
      statusTitle = 'Transfer link not found'
      statusDesc =
        'The transfer link you opened does not exist or may have been permanently removed.'
    }

    return (
      <main className="bleed-header min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-8 overflow-x-hidden">
        {/* Layer 0 & 1: Transfer Background Canvas & Ambient Contrast Scrim */}
        <TransferWallpaperCanvas
          wallpapers={wallpapers}
          onWallpaperChange={setActiveWallpaper}
        />

        <div className="w-full max-w-md mx-auto text-center space-y-6 relative z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <LogoIcon size={36} />
            <span className="font-varela text-xl tracking-tight text-white dark:text-primary drop-shadow-sm">
              Hub Archive
            </span>
          </div>

          <div className="rounded-[28px] bg-white/90 dark:bg-zinc-950/85 backdrop-blur-2xl p-8 sm:p-10 shadow-[0px_20px_48px_rgba(0,0,0,0.18)] border border-white/20 dark:border-white/10 space-y-6">
            <div className="w-14 h-14 mx-auto rounded-full bg-gallery-red/10 text-gallery-red flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-2">
              <span className="font-rubik text-[10px] tracking-[0.2em] text-gallery-red uppercase px-2.5 py-1 rounded-full bg-gallery-red/10">
                {statusBadge}
              </span>
              <h1 className="font-varela text-2xl tracking-tight text-primary pt-2">
                {statusTitle}
              </h1>
              <p className="text-xs text-on-surface/50 leading-relaxed max-w-xs mx-auto">
                {statusDesc}
              </p>
            </div>

            <div className="pt-2">
              <Link href="/">
                <Button variant="gallery" className="w-full h-12 gap-2 text-sm">
                  <ArrowLeft size={16} />
                  Return to Framehouse Hub
                </Button>
              </Link>
            </div>
          </div>

          <p className="font-rubik text-[9.5px] tracking-[0.18em] text-white/50 dark:text-on-surface/30 uppercase drop-shadow-xs">
            Protected by Framehouse Hub Transfer
          </p>
        </div>

        {/* Layer 3: Credit Badge (Positioned inside transfer parent) */}
        <div className="absolute bottom-4 left-4 z-20">
          <TransferWallpaperCreditBadge wallpaper={activeWallpaper} />
        </div>
      </main>
    )
  }

  const FileIcon = getFileIcon(transfer.filename, transfer.mimeType)
  const countdown = formatCountdown(transfer.expiresAt)
  const ext = transfer.filename.split('.').pop()?.toUpperCase() || 'FILE'

  return (
    <main className="bleed-header min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-8 overflow-x-hidden">
      {/* Layer 0 & 1: Transfer Background Canvas & Ambient Contrast Scrim */}
      <TransferWallpaperCanvas
        wallpapers={wallpapers}
        onWallpaperChange={setActiveWallpaper}
      />

      <div className="w-full max-w-xl mx-auto space-y-6 relative z-10">
        {/* Curator Header Mark */}
        <div className="flex items-center justify-center gap-3">
          <LogoIcon size={38} />
          <span className="font-varela text-xl tracking-tight text-white dark:text-primary drop-shadow-sm">
            Framehouse Hub
          </span>
        </div>

        {/* Presentation Card */}
        <div className="rounded-4xl bg-white/90 dark:bg-zinc-950/85 backdrop-blur-2xl p-6 sm:p-10 shadow-[0px_24px_56px_rgba(0,0,0,0.18)] border border-white/20 dark:border-white/10 space-y-8">
          {/* Header & Sender Attribution */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-rubik text-[9.5px] tracking-[0.22em] text-gallery-gold uppercase px-2.5 py-0.5 rounded-full bg-gallery-gold/10">
                File Transfers
              </span>
            </div>

            <div>
              <h1 className="font-varela text-2xl sm:text-3xl tracking-tight text-primary text-ellipsis">
                {transfer.title || transfer.filename}
              </h1>
              <p className="text-xs text-on-surface/50 mt-1">
                Sent by <span className="font-medium text-primary">{senderName}</span>
              </p>
            </div>

            {transfer.message && (
              <div className="p-3.5 rounded-2xl bg-gallery-surface text-xs text-on-surface/70 leading-relaxed italic">
                &ldquo;{transfer.message}&rdquo;
              </div>
            )}
          </div>

          {/* File Metadata Stage */}
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-gallery-surface">
            <div className="w-14 h-14 shrink-0 rounded-2xl bg-gallery-gold/15 text-gallery-gold flex items-center justify-center">
              <FileIcon size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary truncate max-w-xs sm:max-w-sm">
                {transfer.filename}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="font-rubik text-[10px] text-gallery-gold">
                  {formatBytes(transfer.filesize)}
                </span>
                <span className="text-on-surface/20 text-xs">•</span>
                <span className="font-rubik text-[9px] uppercase px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-on-surface/60">
                  {ext}
                </span>
              </div>
            </div>
          </div>

          {/* Expandable Media Preview Stage with Symmetrical Reveal & Hide Transitions (FRH-82) */}
          <AnimatePresence initial={false}>
            {isPreviewOpen && (
              <motion.div
                key="transfer-preview-stage"
                initial={{ opacity: 0, height: 0, scale: 0.98 }}
                animate={{
                  opacity: 1,
                  height: 'auto',
                  scale: 1,
                  transition: {
                    height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.25, delay: 0.05 },
                    scale: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                  },
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  scale: 0.98,
                  transition: {
                    height: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 },
                  },
                }}
                className="overflow-hidden"
              >
                <div className="pb-3">
                  <TransferMediaPreview
                    previewData={previewData}
                    isLoading={isPreviewLoading}
                    filename={transfer.filename}
                    filesize={transfer.filesize}
                    mimeType={transfer.mimeType}
                    onRetry={fetchPreview}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dual Action Cluster: Download + Preview Toggle */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                variant="gallery"
                size="lg"
                onClick={handleSecureDownload}
                disabled={isDownloadingBlob}
                className="flex-1 h-14 gap-2.5 text-base font-semibold shadow-[0px_8px_20px_rgba(127,87,0,0.25)]"
              >
                <Download size={20} />
                {isDownloadingBlob
                  ? 'Preparing download...'
                  : hasClickedDownload
                    ? 'Download again'
                    : 'Download file'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={togglePreview}
                aria-expanded={isPreviewOpen}
                className="h-14 px-5 gap-2 text-sm font-rubik tracking-wider uppercase bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 shrink-0"
              >
                {isPreviewOpen ? (
                  <>
                    <EyeOff size={18} />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye size={18} />
                    <span>Preview</span>
                  </>
                )}
              </Button>
            </div>

            <p className="text-center text-[11px] text-on-surface/40 flex items-center justify-center gap-1.5">
              <Sparkles size={12} className="text-gallery-gold" />
              <span>
                {hasClickedDownload
                  ? 'Your download has begun. Click again if you need another copy.'
                  : 'Click above to download your deliverable in its original fidelity.'}
              </span>
            </p>
          </div>

          {/* Retention & Security Footer */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface/50 border-t border-black/[0.03] dark:border-white/[0.03] pt-4">
            <div className="flex items-center gap-1.5 font-rubik text-[10px] text-gallery-gold">
              <Clock size={13} />
              <span>{countdown.label.toUpperCase()}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-on-surface/40">
              <ShieldCheck size={14} className="text-gallery-gold" />
              <span>Verified Bitstream</span>
            </div>
          </div>
        </div>

        {/* Footer Attribution */}
        <div className="text-center">
          <p className="font-rubik text-[9.5px] tracking-[0.2em] text-white/50 dark:text-on-surface/30 uppercase drop-shadow-xs">
            Framehouse Hub • Transfers
          </p>
        </div>
      </div>

      {/* Layer 3: Credit Badge (Positioned inside transfer parent) */}
      <div className="absolute bottom-4 left-4 z-20">
        <TransferWallpaperCreditBadge wallpaper={activeWallpaper} />
      </div>
    </main>
  )
}
