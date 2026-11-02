'use client'

import {
  FileArchive,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FileAudio,
  File as GenericFile,
  Info,
} from 'lucide-react'

interface TransferFallbackCardProps {
  filename: string
  filesize: number
  mimeType: string
  message?: string
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / 1024 ** i
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`
}

function getFallbackIcon(filename: string, mimeType: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['zip', 'rar', '7z', 'tar', 'gz', 'dmg'].includes(ext)) return FileArchive
  if (['psd', 'ai', 'prproj', 'blend', 'fig', 'sketch'].includes(ext)) return FileCode
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet
  if (mimeType.startsWith('image/') || ['dng', 'cr2', 'arw', 'nef', 'raw'].includes(ext))
    return FileImage
  if (mimeType.startsWith('video/')) return FileVideo
  if (mimeType.startsWith('audio/')) return FileAudio
  if (mimeType.startsWith('text/') || ext === 'pdf') return FileText
  return GenericFile
}

export function TransferFallbackCard({
  filename,
  filesize,
  mimeType,
  message,
}: TransferFallbackCardProps) {
  const ext = filename.split('.').pop()?.toUpperCase() || 'FILE'
  const Icon = getFallbackIcon(filename, mimeType)

  return (
    <div className="w-full rounded-2xl bg-gallery-surface p-6 sm:p-7 flex flex-col items-center justify-center text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-gallery-gold/15 text-gallery-gold flex items-center justify-center">
        <Icon size={28} />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <p className="text-sm font-semibold text-primary truncate max-w-xs sm:max-w-sm">
          {filename}
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="font-rubik text-[10px] text-gallery-gold font-medium">
            {formatBytes(filesize)}
          </span>
          <span className="text-on-surface/20 text-xs">•</span>
          <span className="font-rubik text-[9px] uppercase px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-on-surface/60">
            {ext}
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 text-xs text-on-surface/60 flex items-start gap-2 max-w-md text-left">
        <Info size={16} className="text-gallery-gold shrink-0 mt-0.5" />
        <span className="text-[11px] leading-relaxed">
          {message ||
            'This deliverable format is not previewable in-browser. Please use the download button to fetch the file.'}
        </span>
      </div>
    </div>
  )
}

