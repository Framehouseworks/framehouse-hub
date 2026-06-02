'use client'

import React, { useRef, useCallback, useState } from 'react'
import { cn } from '@/utilities/cn'
import type { FocalPoint } from '../types'

interface CropPreviewProps {
  imageUrl: string
  focalPoint: FocalPoint
  aspect: [number, number]
  label: string
}

function CropPreview({ imageUrl, focalPoint, aspect, label }: CropPreviewProps) {
  const [w, h] = aspect
  const paddingBottom = `${(h / w) * 100}%`

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      <div
        className="relative w-full overflow-hidden rounded-lg bg-zinc-900"
        style={{ paddingBottom }}
        role="presentation"
        aria-label={`${label} crop preview`}
      >
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: 'cover',
            objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
          }}
          loading="lazy"
        />
      </div>
      <span className="text-[9px] text-on-surface/30 text-center font-rubik tracking-wider uppercase">
        {label}
      </span>
    </div>
  )
}

interface FocalPointCanvasProps {
  imageUrl: string
  focalPoint: FocalPoint
  onChange: (fp: FocalPoint) => void
  className?: string
  /** When true, crop previews render as a vertical column to the right of the canvas */
  sideLayout?: boolean
}

export function FocalPointCanvas({
  imageUrl,
  focalPoint,
  onChange,
  className,
  sideLayout = false,
}: FocalPointCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [dragging, setDragging] = useState(false)

  function computePercent(clientX: number, clientY: number): FocalPoint {
    if (!imgRef.current) return focalPoint
    const rect = imgRef.current.getBoundingClientRect()
    const x = Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)))
    const y = Math.round(Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)))
    return { x, y }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      setDragging(true)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      onChange(computePercent(e.clientX, e.clientY))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, focalPoint],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return
      onChange(computePercent(e.clientX, e.clientY))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragging, onChange, focalPoint],
  )

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  // Keyboard: move focal point 1% at a time
  function handleKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 10 : 1
    let { x, y } = focalPoint
    if (e.key === 'ArrowLeft') x = Math.max(0, x - step)
    else if (e.key === 'ArrowRight') x = Math.min(100, x + step)
    else if (e.key === 'ArrowUp') y = Math.max(0, y - step)
    else if (e.key === 'ArrowDown') y = Math.min(100, y + step)
    else return
    e.preventDefault()
    onChange({ x, y })
  }

  const canvas = (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full bg-zinc-950 rounded-2xl overflow-hidden select-none cursor-crosshair',
      )}
      style={{ aspectRatio: '4/3' }}
      role="application"
      aria-label="Click to set focal point. Use arrow keys to fine-tune."
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Asset preview for focal point selection"
        className="w-full h-full object-contain"
        draggable={false}
        loading="eager"
      />

      {/* Focal point dot */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${focalPoint.x}%`,
          top: `${focalPoint.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
        aria-hidden="true"
      >
        <div className="w-8 h-8 rounded-full border-2 border-gallery-gold/60 shadow-[0_0_0_1px_rgba(0,0,0,0.4)] flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-gallery-gold shadow-[0px_2px_8px_rgba(127,87,0,0.6)]" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-12 h-px bg-gallery-gold/30" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-px h-12 bg-gallery-gold/30" />
        </div>
      </div>

      {/* Instruction overlay — fades while dragging */}
      <div
        className={cn(
          'absolute inset-0 flex items-end justify-center pb-3 pointer-events-none transition-opacity duration-500',
          dragging ? 'opacity-0' : 'opacity-100',
        )}
        aria-hidden="true"
      >
        <span className="text-[9px] text-white/40 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full uppercase tracking-wider font-rubik">
          Click or drag to set focal point
        </span>
      </div>
    </div>
  )

  const numericInputs = (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 flex-1">
        <label className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase w-4">
          X
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={focalPoint.x}
          onChange={(e) => onChange({ ...focalPoint, x: Math.max(0, Math.min(100, Number(e.target.value))) })}
          className="flex-1 bg-gallery-surface/60 rounded-xl px-3 py-1.5 text-xs text-primary border border-transparent focus:border-gallery-gold/40 focus:outline-none text-center"
          aria-label="Focal point X percentage"
        />
        <span className="text-[10px] text-on-surface/30">%</span>
      </div>
      <div className="flex items-center gap-2 flex-1">
        <label className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase w-4">
          Y
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={focalPoint.y}
          onChange={(e) => onChange({ ...focalPoint, y: Math.max(0, Math.min(100, Number(e.target.value))) })}
          className="flex-1 bg-gallery-surface/60 rounded-xl px-3 py-1.5 text-xs text-primary border border-transparent focus:border-gallery-gold/40 focus:outline-none text-center"
          aria-label="Focal point Y percentage"
        />
        <span className="text-[10px] text-on-surface/30">%</span>
      </div>
      <button
        type="button"
        onClick={() => onChange({ x: 50, y: 50 })}
        className="text-[10px] text-on-surface/30 hover:text-on-surface/60 underline underline-offset-2"
        aria-label="Reset focal point to center"
      >
        Reset
      </button>
    </div>
  )

  const cropPreviews = (
    <div aria-label="Crop simulations based on focal point">
      <p className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/30 uppercase mb-2">
        Crop previews
      </p>
      {sideLayout ? (
        /* Side layout: previews stacked vertically */
        <div className="flex flex-col gap-2">
          <CropPreview imageUrl={imageUrl} focalPoint={focalPoint} aspect={[9, 16]} label="9:16" />
          <CropPreview imageUrl={imageUrl} focalPoint={focalPoint} aspect={[1, 1]} label="1:1" />
          <CropPreview imageUrl={imageUrl} focalPoint={focalPoint} aspect={[16, 9]} label="16:9" />
        </div>
      ) : (
        /* Default layout: previews in a horizontal row */
        <div className="flex gap-2 min-w-0 overflow-hidden">
          <CropPreview imageUrl={imageUrl} focalPoint={focalPoint} aspect={[9, 16]} label="9:16" />
          <CropPreview imageUrl={imageUrl} focalPoint={focalPoint} aspect={[1, 1]} label="1:1" />
          <CropPreview imageUrl={imageUrl} focalPoint={focalPoint} aspect={[16, 9]} label="16:9" />
        </div>
      )}
    </div>
  )

  if (sideLayout) {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <div className="flex gap-4 items-stretch min-w-0">
          {/* Canvas + X/Y inputs — left column, grows to fill */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {canvas}
            {numericInputs}
          </div>
          {/* Crop previews — right column, fixed width so previews are legible */}
          <div className="flex-shrink-0 w-[88px] sm:w-[100px]">
            {cropPreviews}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {canvas}
      {numericInputs}
      {cropPreviews}
    </div>
  )
}
