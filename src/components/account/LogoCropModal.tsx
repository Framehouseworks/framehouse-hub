'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/utilities/cn'

type AspectRatio = '1:1' | '4:1'

type Props = {
  open: boolean
  file: File | null
  onCropped: (blob: Blob, filename: string) => void
  onClose: () => void
}

const ASPECT_OPTIONS: { label: string; value: AspectRatio; ratio: number }[] = [
  { label: 'Square (1:1)', value: '1:1', ratio: 1 },
  { label: 'Banner (4:1)', value: '4:1', ratio: 4 },
]

export const LogoCropModal: React.FC<Props> = ({ open, file, onCropped, onClose }) => {
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('1:1')
  const [imgSrc, setImgSrc] = useState<string>('')
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [cropW, setCropW] = useState(0)
  const [cropH, setCropH] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 })

  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load file as data URL
  useEffect(() => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setImgSrc(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [file])

  // Reset crop when ratio or image changes
  const resetCrop = useCallback(() => {
    if (!displaySize.w || !displaySize.h) return
    const ratio = ASPECT_OPTIONS.find((o) => o.value === selectedRatio)!.ratio
    const maxW = displaySize.w
    const maxH = displaySize.h
    let w = maxW
    let h = w / ratio
    if (h > maxH) {
      h = maxH
      w = h * ratio
    }
    setCropW(w)
    setCropH(h)
    setCropX((displaySize.w - w) / 2)
    setCropY((displaySize.h - h) / 2)
  }, [displaySize, selectedRatio])

  useEffect(() => {
    resetCrop()
  }, [resetCrop])

  const handleImgLoad = () => {
    const img = imgRef.current
    if (!img) return
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
    // Set display size from the actual rendered image size after layout
    const rect = img.getBoundingClientRect()
    setDisplaySize({ w: rect.width || img.clientWidth, h: rect.height || img.clientHeight })
  }

  // Pointer drag to reposition crop box
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - cropX, y: e.clientY - cropY })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const newX = Math.max(0, Math.min(e.clientX - dragStart.x, displaySize.w - cropW))
    const newY = Math.max(0, Math.min(e.clientY - dragStart.y, displaySize.h - cropH))
    setCropX(newX)
    setCropY(newY)
  }

  const handlePointerUp = () => setIsDragging(false)

  const handleCrop = () => {
    if (!imgRef.current || !naturalSize.w || !displaySize.w || !file) return

    const scaleX = naturalSize.w / displaySize.w
    const scaleY = naturalSize.h / displaySize.h

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const outW = Math.round(cropW * scaleX)
    const outH = Math.round(cropH * scaleY)
    canvas.width = outW
    canvas.height = outH

    ctx.drawImage(
      imgRef.current,
      cropX * scaleX,
      cropY * scaleY,
      outW,
      outH,
      0,
      0,
      outW,
      outH,
    )

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onCropped(blob, file.name.replace(/\.[^.]+$/, '.png'))
      },
      'image/png',
      0.92,
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-black/[0.04] dark:border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Crop Studio Logo</DialogTitle>
            <DialogDescription className="text-sm text-on-surface/50">
              Choose a ratio and drag to position your logo.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Ratio selector */}
          <div className="flex gap-2">
            {ASPECT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedRatio(opt.value)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                  selectedRatio === opt.value
                    ? 'bg-gallery-gold/10 text-gallery-gold border-gallery-gold/30'
                    : 'text-on-surface/50 border-transparent bg-gallery-surface hover:bg-black/5',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Crop canvas */}
          {imgSrc && (
            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-xl bg-black/5 dark:bg-white/5 select-none"
              style={{ maxHeight: 300 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={imgSrc}
                alt="Logo preview"
                onLoad={handleImgLoad}
                className="w-full h-auto max-h-[300px] object-contain"
                draggable={false}
              />
              {/* Dark overlay */}
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
              {/* Crop box */}
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={cn(
                  'absolute border-2 border-white cursor-move',
                  isDragging && 'opacity-90',
                )}
                style={{
                  left: cropX,
                  top: cropY,
                  width: cropW,
                  height: cropH,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                  touchAction: 'none',
                }}
                role="presentation"
                aria-label="Drag to position crop area"
              />
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-2xl"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white hover:opacity-90"
              onClick={handleCrop}
            >
              Apply Crop
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
