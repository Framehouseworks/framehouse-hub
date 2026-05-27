'use client'

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUpload } from '@/providers/UploadProvider'
import { CloudUpload, Image as ImageIcon, Clapperboard, MapPin, Tag } from 'lucide-react'
import NextImage from 'next/image'
import { LocationSearch, type PhotonResult } from '@/components/ui/location-search'
import { TagInput } from '@/components/ui/tag-input'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'

interface SessionOption {
  id: number
  name: string
}

// ─── Field label ────────────────────────────────────────────────────────────
function FieldLabel({
  icon: Icon,
  children,
  required,
}: {
  icon: React.ElementType
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="h-3 w-3 text-on-surface/30 flex-shrink-0" />
      <span className="font-space-mono text-[10px] font-bold text-on-surface/40 uppercase tracking-[0.18em]">
        {children}
      </span>
      {required && <span className="text-[#ff7f67] text-[10px] leading-none">*</span>}
    </div>
  )
}

export const IngestionWorkbench: React.FC = () => {
  const { stagedFiles, isWorkbenchOpen, closeWorkbench, commitStagedFiles } = useUpload()

  const [sessionOptions, setSessionOptions] = useState<ComboboxOption[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<number | undefined>()
  const [selectedSessionName, setSelectedSessionName] = useState('')
  const [sessionError, setSessionError] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [locationAddress, setLocationAddress] = useState('')
  const [locationLat, setLocationLat] = useState<number | undefined>()
  const [locationLng, setLocationLng] = useState<number | undefined>()

  useEffect(() => {
    if (!isWorkbenchOpen) return
    fetch('/api/sessions?limit=50&depth=0&sort=-createdAt', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const docs: SessionOption[] = data?.docs ?? []
        setSessionOptions(docs.map((s) => ({ value: String(s.id), label: s.name })))
      })
      .catch(() => {})
  }, [isWorkbenchOpen])

  const totalSize = useMemo(() => {
    const bytes = stagedFiles.reduce((acc, f) => acc + f.size, 0)
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }, [stagedFiles])

  const formatDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    stagedFiles.forEach((f) => {
      const ext = (f.name.split('.').pop() || 'unknown').toUpperCase()
      counts[ext] = (counts[ext] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [stagedFiles])

  const previews = useMemo(
    () => stagedFiles.slice(0, 4).map((f) => URL.createObjectURL(f)),
    [stagedFiles],
  )

  const handleLocationSelect = useCallback((result: PhotonResult) => {
    const [lon, lat] = result.geometry.coordinates
    setLocationLat(lat)
    setLocationLng(lon)
  }, [])

  const handleSessionChange = useCallback(
    async (value: string, isNew?: boolean) => {
      setSessionError('')
      if (isNew) {
        try {
          const res = await fetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: value }),
          })
          if (!res.ok) throw new Error()
          const data = await res.json()
          const s = data?.doc ?? data
          const opt: ComboboxOption = { value: String(s.id), label: s.name }
          setSessionOptions((prev) => [opt, ...prev])
          setSelectedSessionId(s.id)
          setSelectedSessionName(s.name)
        } catch {
          setSessionError('Could not create session — try again.')
        }
      } else {
        const opt = sessionOptions.find((o) => o.value === value)
        setSelectedSessionId(Number(value))
        setSelectedSessionName(opt?.label ?? '')
      }
    },
    [sessionOptions],
  )

  const onIngest = () => {
    if (!selectedSessionId) {
      setSessionError('Choose or create a session to continue.')
      return
    }
    commitStagedFiles({
      sessionId: selectedSessionId,
      shootName: selectedSessionName,
      tags,
      location: locationAddress
        ? { address: locationAddress, latitude: locationLat, longitude: locationLng }
        : undefined,
    })
    setSelectedSessionId(undefined)
    setSelectedSessionName('')
    setTags([])
    setLocationAddress('')
    setLocationLat(undefined)
    setLocationLng(undefined)
    setSessionError('')
  }

  return (
    <Dialog open={isWorkbenchOpen} onOpenChange={closeWorkbench}>
      <DialogContent className="w-full max-w-4xl max-h-[95dvh] p-0 overflow-hidden bg-white dark:bg-[#0d0f14] border-none rounded-[28px] sm:rounded-[32px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.25)] outline-none flex flex-col">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="px-6 sm:px-10 pt-8 sm:pt-10 pb-6 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="h-1 w-5 rounded-full bg-gallery-gold/60" />
              <span className="font-space-mono text-[9px] font-bold text-gallery-gold/60 uppercase tracking-[0.25em]">
                Ingest Queue
              </span>
            </div>
            <h1 className="font-inter text-2xl sm:text-3xl font-semibold text-primary tracking-tight leading-tight">
              {stagedFiles.length}{' '}
              {stagedFiles.length === 1 ? 'file' : 'files'} ready
            </h1>
            <p className="mt-1 font-inter text-sm text-on-surface/40">
              Add session details before committing to your archive.
            </p>
          </div>

          {/* Size badge — tonal, no border */}
          <div className="flex-shrink-0 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl px-4 py-2.5 text-right">
            <p className="font-rubik text-xs text-on-surface/40 uppercase tracking-wider">Total</p>
            <p className="font-rubik text-base font-bold text-on-surface/70 tabular-nums">
              {totalSize}
            </p>
          </div>
        </div>

        {/* ── Body — scrollable ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 sm:px-10 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

            {/* Left — preview bento + format badges */}
            <div className="lg:col-span-7 space-y-4">
              {/* Preview grid */}
              <div
                className={`grid gap-3 rounded-[24px] overflow-hidden ${
                  previews.length >= 3
                    ? 'grid-cols-3 h-[200px] sm:h-[240px]'
                    : 'grid-cols-1 h-[160px] sm:h-[200px]'
                }`}
              >
                {previews.length > 0 ? (
                  previews.map((src, idx) => {
                    const isFirst = idx === 0
                    const isLast = idx === previews.length - 1 && idx > 0
                    const remaining = stagedFiles.length - previews.length
                    return (
                      <div
                        key={idx}
                        className={`relative overflow-hidden rounded-[20px] bg-black/[0.04] dark:bg-white/[0.04] ${
                          isFirst && previews.length >= 3 ? 'col-span-2 row-span-2' : ''
                        }`}
                      >
                        <NextImage
                          src={src}
                          fill
                          className="object-cover"
                          alt={`Preview ${idx + 1}`}
                          unoptimized
                        />
                        {isFirst && (
                          <div className="absolute bottom-3 left-3 bg-white/80 dark:bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl">
                            <p className="font-space-mono text-[9px] font-bold text-primary truncate max-w-[120px] sm:max-w-[160px]">
                              {stagedFiles[0].name}
                            </p>
                          </div>
                        )}
                        {isLast && remaining > 0 && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center rounded-[20px]">
                            <span className="font-rubik text-white text-lg font-bold">
                              +{remaining}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-3 h-full bg-black/[0.03] dark:bg-white/[0.03] rounded-[24px] flex flex-col items-center justify-center gap-3">
                    <ImageIcon className="text-on-surface/15" size={40} />
                    <span className="font-space-mono text-[9px] text-on-surface/25 uppercase tracking-widest">
                      No previews
                    </span>
                  </div>
                )}
              </div>

              {/* Format distribution — tonal card, no border */}
              {formatDistribution.length > 0 && (
                <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-[20px] p-4 sm:p-5">
                  <p className="font-space-mono text-[9px] font-bold tracking-[0.2em] text-on-surface/30 uppercase mb-3">
                    Formats
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formatDistribution.map(([ext, count]) => (
                      <div
                        key={ext}
                        className="bg-white dark:bg-white/[0.06] rounded-xl px-3 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      >
                        <span className="font-rubik text-[9px] font-bold text-on-surface/60">
                          .{ext}
                        </span>
                        <span className="font-rubik text-[9px] text-on-surface/30 ml-1.5">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right — metadata fields */}
            <div className="lg:col-span-5 space-y-5">

              {/* Session — required */}
              <div>
                <FieldLabel icon={Clapperboard} required>
                  Session
                </FieldLabel>
                <Combobox
                  options={sessionOptions}
                  value={selectedSessionId ? String(selectedSessionId) : undefined}
                  onChange={handleSessionChange}
                  placeholder="Select or create…"
                  allowCreate
                  createLabel={(v) => `Create "${v}"`}
                  aria-label="Session"
                />
                {sessionError && (
                  <p className="mt-1.5 font-inter text-[11px] text-[#bb1800] dark:text-[#ff7f67] ml-0.5">
                    {sessionError}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <FieldLabel icon={MapPin}>Location</FieldLabel>
                <LocationSearch
                  value={locationAddress}
                  onChange={setLocationAddress}
                  onLocationSelect={handleLocationSelect}
                  hasExistingGps={false}
                  placeholder="Search location…"
                />
              </div>

              {/* Tags */}
              <div>
                <FieldLabel icon={Tag}>Tags</FieldLabel>
                <TagInput
                  tags={tags}
                  onChange={setTags}
                  placeholder="Type and press Enter…"
                  maxTags={20}
                />
              </div>

              {/* Hint — tonal, no border */}
              <div className="bg-gallery-gold/[0.06] rounded-[16px] px-4 py-3">
                <p className="font-inter text-[11px] text-on-surface/50 leading-relaxed">
                  EXIF metadata, camera info and GPS coordinates are extracted automatically after upload.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions — sticky footer ─────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 sm:px-10 py-5 sm:py-6 bg-white/80 dark:bg-[#0d0f14]/80 backdrop-blur-xl border-t-0 space-y-2.5">
          <Button
            onClick={onIngest}
            className="w-full h-14 rounded-[20px] bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white hover:opacity-90 shadow-[0_12px_32px_rgba(215,153,34,0.25)] font-inter text-sm font-semibold tracking-tight transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2.5"
          >
            <CloudUpload size={18} />
            Start Ingest
          </Button>
          <Button
            variant="ghost"
            onClick={closeWorkbench}
            className="w-full h-10 rounded-[16px] text-on-surface/35 hover:text-on-surface/60 font-space-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors"
          >
            Cancel & clear queue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
