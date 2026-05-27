'use client'

import React from 'react'
import { Star, FolderPlus, Download, Link2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Media } from '@/payload-types'
import { cn } from '@/utilities/cn'

interface ActionBarProps {
  media: Media
  onDeleteRequest: () => void
  /** Additional class names for the container pill */
  className?: string
}

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'danger' | 'active'
  disabled?: boolean
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = 'default',
  disabled,
}) => (
  <button
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'relative group flex items-center justify-center w-10 h-10 rounded-[20px] transition-all duration-150',
      'hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
      variant === 'danger' && 'hover:bg-red-500/15 text-red-400',
      variant === 'active' && 'bg-gallery-gold/20 text-gallery-gold',
      variant === 'default' && 'hover:bg-white/10 text-white/60 hover:text-white',
    )}
  >
    {icon}
    {/* Hover label tooltip */}
    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-black/80 text-white text-[9px] font-bold tracking-wider uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150">
      {label}
    </span>
  </button>
)

function resolveDownloadUrl(media: Media): string | null {
  const raw = media.originalUrl || media.proxyUrl || media.url
  if (!raw) return null
  if (raw.startsWith('http')) return raw
  return `${process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'}${raw}`
}

export const ActionBar: React.FC<ActionBarProps> = ({ media, onDeleteRequest, className }) => {
  const handleFavourite = () => {
    toast.info('Starring assets coming in v1')
  }

  const handlePortfolio = () => {
    toast.info('Portfolio assignment coming in v1')
  }

  const handleDownload = () => {
    const url = resolveDownloadUrl(media)
    if (!url) {
      toast.error('No downloadable file available yet')
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = media.filename || media.title || 'asset'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleShare = async () => {
    const url = resolveDownloadUrl(media)
    if (!url) {
      toast.error('No shareable URL available yet')
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not access clipboard')
    }
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 px-3 py-2 rounded-[28px]',
        'bg-black/50 backdrop-blur-[20px]',
        'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        className,
      )}
    >
      <ActionButton icon={<Star size={16} />} label="Favourite" onClick={handleFavourite} />
      <ActionButton
        icon={<FolderPlus size={16} />}
        label="Add to Portfolio"
        onClick={handlePortfolio}
      />

      {/* Divider */}
      <div className="w-px h-5 bg-white/10 mx-1" />

      <ActionButton icon={<Download size={16} />} label="Download" onClick={handleDownload} />
      <ActionButton icon={<Link2 size={16} />} label="Copy Link" onClick={handleShare} />

      {/* Divider */}
      <div className="w-px h-5 bg-white/10 mx-1" />

      <ActionButton
        icon={<Trash2 size={16} />}
        label="Delete"
        onClick={onDeleteRequest}
        variant="danger"
      />
    </div>
  )
}
