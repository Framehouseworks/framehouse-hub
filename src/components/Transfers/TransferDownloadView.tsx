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
import type { Transfer, User } from '@/payload-types'
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
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

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
    return { label: `Expires in ${days}d ${hours}h`, isExpired: false }
  }
  if (hours > 0) {
    return { label: `Expires in ${hours}h ${minutes}m`, isExpired: false }
  }
  return { label: `Expires in ${minutes}m`, isExpired: false }
}

export type TransferStatus = 'active' | 'revoked' | 'expired' | 'not_found'

interface TransferDownloadViewProps {
  transfer: Transfer | null
  status?: TransferStatus
  /** Backwards-compatible flag */
  expired?: boolean
}

export function TransferDownloadView({
  transfer,
  status,
  expired = false,
}: TransferDownloadViewProps) {
  const [hasClickedDownload, setHasClickedDownload] = useState(false)

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
      <main className="min-h-screen bg-gallery-surface flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md mx-auto text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <LogoIcon size={36} />
            <span className="font-varela text-xl tracking-tight text-primary">Hub Archive</span>
          </div>

          <div className="rounded-[28px] bg-white/80 dark:bg-white/[0.04] backdrop-blur-xl p-8 sm:p-10 shadow-[0px_20px_48px_rgba(26,28,28,0.06)] space-y-6">
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

          <p className="font-rubik text-[9.5px] tracking-[0.18em] text-on-surface/30 uppercase">
            Protected by Framehouse Hub Transfer
          </p>
        </div>
      </main>
    )
  }

  const FileIcon = getFileIcon(transfer.filename, transfer.mimeType)
  const countdown = formatCountdown(transfer.expiresAt)
  const ext = transfer.filename.split('.').pop()?.toUpperCase() || 'FILE'

  return (
    <main className="min-h-screen bg-gallery-surface flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Curator Header Mark */}
        <div className="flex items-center justify-center gap-3">
          <LogoIcon size={38} />
          <span className="font-varela text-xl tracking-tight text-primary">Framehouse Hub</span>
        </div>

        {/* Archival Museum-Grade Presentation Card */}
        <div className="rounded-[32px] bg-white/80 dark:bg-white/[0.04] backdrop-blur-2xl p-6 sm:p-10 shadow-[0px_24px_56px_rgba(26,28,28,0.07)] space-y-8">
          {/* Header & Sender Attribution */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-rubik text-[9.5px] tracking-[0.22em] text-gallery-gold uppercase px-2.5 py-0.5 rounded-full bg-gallery-gold/10">
                File Transfer
              </span>
              <span className="text-on-surface/20 text-xs">•</span>
              <span className="font-rubik text-[9.5px] tracking-[0.18em] text-on-surface/40 uppercase">
                Direct Delivery
              </span>
            </div>

            <div>
              <h1 className="font-varela text-2xl sm:text-3xl tracking-tight text-primary">
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

          {/* Download Action & Interactive Dispatch Notice */}
          <div className="space-y-3">
            <a
              href={downloadUrl}
              download={transfer.filename}
              rel="noopener noreferrer"
              onClick={() => setHasClickedDownload(true)}
              className="block"
            >
              <Button
                variant="gallery"
                size="lg"
                className="w-full h-14 gap-2.5 text-base font-semibold shadow-[0px_8px_20px_rgba(127,87,0,0.25)]"
              >
                <Download size={20} />
                {hasClickedDownload ? 'Download again' : 'Download file'}
              </Button>
            </a>

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
          <p className="font-rubik text-[9.5px] tracking-[0.2em] text-on-surface/30 uppercase">
            Framehouse Hub • Curated Digital Transfer
          </p>
        </div>
      </div>
    </main>
  )
}
