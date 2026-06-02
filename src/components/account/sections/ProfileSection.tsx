'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UploadCloud, X } from 'lucide-react'
import { cn } from '@/utilities/cn'
import { toast } from 'sonner'
import { LogoCropModal } from '@/components/account/LogoCropModal'
import type { Media as MediaType } from '@/payload-types'

const ACCEPTED_LOGO_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg']
const MAX_LOGO_BYTES = 2 * 1024 * 1024 // 2 MB

// 1:1 tolerance band ±5 % and 4:1 tolerance band ±5 %
function needsCrop(w: number, h: number): boolean {
  if (h === 0) return false
  const ratio = w / h
  const isSquare = ratio >= 0.95 && ratio <= 1.05
  const isBanner = ratio >= 3.8 && ratio <= 4.2
  return !isSquare && !isBanner
}

type Props = {
  logoPreview: string | null
  existingLogo: MediaType | null
  onLogoChange: (file: File | null, previewUrl: string | null) => void
  onLogoClear: () => void
}

export const ProfileSection: React.FC<Props> = ({
  logoPreview,
  existingLogo,
  onLogoChange,
  onLogoClear,
}) => {
  const { register, watch } = useFormContext()
  const bio = watch('bio') as string
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [cropOpen, setCropOpen] = useState(false)

  // Revoke blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview)
    }
  }, [logoPreview])

  const handleFileSelect = (file: File) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast.error('Only .svg, .png, and .jpg files are accepted.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Studio logo must be under 2 MB.')
      return
    }
    if (file.type === 'image/svg+xml') {
      // SVGs are scalable — skip crop, use directly
      onLogoChange(file, URL.createObjectURL(file))
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (needsCrop(img.naturalWidth, img.naturalHeight)) {
        setPendingFile(file)
        setCropOpen(true)
      } else {
        onLogoChange(file, URL.createObjectURL(file))
      }
    }
    img.src = url
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }

  const currentLogoUrl = logoPreview ?? existingLogo?.thumbnailUrl ?? existingLogo?.url ?? null

  return (
    <section id="profile" className="space-y-6 scroll-mt-[148px] lg:scroll-mt-8">
      <div>
        <h2 className="text-lg font-semibold text-on-surface">Profile & Studio Identity</h2>
        <p className="mt-1 text-sm text-on-surface/50">
          Your public professional identity across the platform.
        </p>
      </div>

      <div className="bg-gallery-surface/60 rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
        {/* Studio Logo */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Studio Logo</Label>
          <p className="text-xs text-on-surface/40">
            .svg, .png, .jpg — max 2 MB. Square (1:1) or banner (4:1) recommended.
          </p>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            aria-label="Upload studio logo"
            className={cn(
              'relative flex items-center gap-4 p-4 sm:p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all min-h-[72px] touch-manipulation',
              'border-on-surface/10 hover:border-gallery-gold/40 hover:bg-gallery-gold/5',
            )}
          >
            {currentLogoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- blob/data URLs cannot use next/image */}
                <img
                  src={currentLogoUrl}
                  alt="Studio logo preview"
                  className="h-14 w-14 rounded-xl object-contain bg-white border border-black/[0.05]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">
                    {pendingFile?.name ?? 'Current logo'}
                  </p>
                  <p className="text-xs text-on-surface/40">Click to replace</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onLogoClear()
                  }}
                  aria-label="Remove studio logo"
                  className="w-7 h-7 rounded-full bg-gallery-red/10 flex items-center justify-center text-gallery-red hover:bg-gallery-red/20 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-xl bg-on-surface/5 flex items-center justify-center shrink-0">
                  <UploadCloud size={22} className="text-on-surface/30" />
                </div>
                <div>
                  <p className="text-sm font-medium text-on-surface/70">Drop logo here</p>
                  <p className="text-xs text-on-surface/40">or click to browse</p>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFileSelect(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Full Name
          </Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Your full name"
            className="rounded-2xl"
          />
        </div>

        {/* Studio Name */}
        <div className="space-y-2">
          <Label htmlFor="studioName" className="text-sm font-medium">
            Studio / Agency Name
          </Label>
          <Input
            id="studioName"
            {...register('studioName')}
            placeholder="e.g. Framehouse Studio"
            className="rounded-2xl"
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="bio" className="text-sm font-medium">
              Bio
            </Label>
            <span
              className={cn(
                'font-rubik text-[10px]',
                (bio?.length ?? 0) > 300 ? 'text-gallery-red' : 'text-on-surface/30',
              )}
            >
              {bio?.length ?? 0}/300
            </span>
          </div>
          <Textarea
            id="bio"
            {...register('bio', { maxLength: 300 })}
            placeholder="A short professional introduction…"
            rows={3}
            maxLength={300}
            className="rounded-2xl resize-none"
          />
        </div>
      </div>

      <LogoCropModal
        open={cropOpen}
        file={pendingFile}
        onCropped={(blob, filename) => {
          setCropOpen(false)
          const croppedFile = new File([blob], filename, { type: 'image/png' })
          onLogoChange(croppedFile, URL.createObjectURL(blob))
          setPendingFile(null)
        }}
        onClose={() => {
          setCropOpen(false)
          setPendingFile(null)
        }}
      />
    </section>
  )
}
