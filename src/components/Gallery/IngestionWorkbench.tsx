'use client'

import React, { useMemo } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useUpload } from '@/providers/UploadProvider'
import { useForm } from 'react-hook-form'
import { CloudUpload, MapPin, Image as ImageIcon } from 'lucide-react'
import NextImage from 'next/image'

interface IngestionWorkbenchFormData {
  shootName: string
  locationAddress: string
}

export const IngestionWorkbench: React.FC = () => {
  const { stagedFiles, isWorkbenchOpen, closeWorkbench, commitStagedFiles } = useUpload()

  const { register, handleSubmit } = useForm<IngestionWorkbenchFormData>({
    defaultValues: {
      shootName: '',
      locationAddress: '',
    },
  })

  const totalSize = useMemo(() => {
    const bytes = stagedFiles.reduce((acc, file) => acc + file.size, 0)
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [stagedFiles])

  const estimatedTime = useMemo(() => {
    const bytes = stagedFiles.reduce((acc, file) => acc + file.size, 0)
    if (bytes === 0) return '0s'

    // Determine environment-specific throughput
    // Local development: 100MB/s (Fast SSD to Local Server)
    // Cloud (Free Tier): 5MB/s (Conservative S3/Vercel Throughput)
    const isLocal =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const mbps = isLocal ? 100 : 5
    const totalSeconds = bytes / (mbps * 1024 * 1024)

    if (totalSeconds < 60) return `${Math.ceil(totalSeconds)}S`
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.ceil(totalSeconds % 60)
    return `${minutes}M ${seconds}S`
  }, [stagedFiles])

  const formatDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    stagedFiles.forEach((file) => {
      const ext = (file.name.split('.').pop() || 'unknown').toUpperCase()
      counts[ext] = (counts[ext] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [stagedFiles])

  // Bento Previews (First 3)
  const previews = useMemo(() => {
    return stagedFiles.slice(0, 3).map((file) => URL.createObjectURL(file))
  }, [stagedFiles])

  const onIngest = (data: IngestionWorkbenchFormData) => {
    // Heuristic tags from filenames
    const allParts = stagedFiles.flatMap((f) => f.name.split(/[._\-\s]+/))
    const heuristicTags = Array.from(
      new Set(allParts.filter((p) => p.length > 3 && !/^\d+$/.test(p)).map((p) => p.toUpperCase())),
    ).slice(0, 5)

    // Add Shoot Name as a primary tag for batch grouping
    if (data.shootName) {
      heuristicTags.unshift(data.shootName.toUpperCase().replace(/\s+/g, '_'))
    }

    commitStagedFiles({
      location: data.locationAddress,
      tags: heuristicTags,
      // We don't overwrite title here to keep individual filenames as baseline
    })
  }

  return (
    <Dialog open={isWorkbenchOpen} onOpenChange={closeWorkbench}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-white dark:bg-[#0a0c10] border-none rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] outline-none">
        {/* Modal Header */}
        <div className="px-12 pt-12 pb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-inter text-3xl font-semibold text-primary tracking-tight mb-1">
                {stagedFiles.length} Archives Ready to Ingest
              </h1>
              <p className="font-space-mono text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">
                Staging Area: Commit to Source-of-Truth
              </p>
            </div>
            <div className="bg-[#ff7f67]/10 px-4 py-2 rounded-xl border border-[#ff7f67]/20">
              <p className="font-rubik text-[14px] text-[#901000]">{totalSize}</p>
            </div>
          </div>
        </div>

        {/* Modal Body: Asymmetric Layout */}
        <div className="flex-1 px-12 pb-12 grid grid-cols-12 gap-8">
          {/* Left: Visual Summary / Bento (7 cols) */}
          <div className="col-span-7 space-y-8">
            <div className="grid grid-cols-3 gap-6 h-[300px]">
              {previews.length > 0 ? (
                <>
                  <div className="col-span-2 row-span-2 relative rounded-[24px] overflow-hidden bg-black/[0.03]">
                    <NextImage
                      src={previews[0]}
                      fill
                      className="object-cover"
                      alt="Primary Staged"
                      unoptimized
                    />
                    <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
                      <p className="font-space-mono text-[10px] font-bold text-primary truncate max-w-[150px]">
                        {stagedFiles[0].name}
                      </p>
                    </div>
                  </div>
                  {previews[1] && (
                    <div className="aspect-square relative rounded-[16px] overflow-hidden bg-black/[0.03]">
                      <NextImage
                        src={previews[1]}
                        fill
                        className="object-cover"
                        alt="Staged 2"
                        unoptimized
                      />
                    </div>
                  )}
                  {previews[2] && (
                    <div className="aspect-square relative rounded-[16px] overflow-hidden bg-black/[0.03]">
                      <NextImage
                        src={previews[2]}
                        fill
                        className="object-cover"
                        alt="Staged 3"
                        unoptimized
                      />
                      {stagedFiles.length > 3 && (
                        <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                          <span className="font-rubik text-white text-xl">
                            +{stagedFiles.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="col-span-3 aspect-video bg-black/[0.03] rounded-[24px] flex items-center justify-center border-2 border-dashed border-black/[0.05]">
                  <ImageIcon className="text-on-surface/20" size={48} />
                </div>
              )}
            </div>

            {/* Technical Specs Table */}
            <div className="bg-black/[0.02] dark:bg-white/[0.02] p-8 rounded-[24px] border border-black/[0.03] dark:border-white/[0.03]">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="font-space-mono text-[10px] font-bold tracking-widest text-on-surface/30 uppercase mb-3">
                    Format Distribution
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {formatDistribution.map(([ext, count]) => (
                      <div
                        key={ext}
                        className="bg-white dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/[0.05] shadow-sm"
                      >
                        <p className="font-rubik text-[9px] text-primary">
                          .{ext} <span className="opacity-40 ml-1">({count})</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-space-mono text-[10px] font-bold tracking-widest text-on-surface/30 uppercase mb-3">
                    Ingestion Estimate
                  </p>
                  <p className="font-rubik text-[14px] text-primary">
                    {estimatedTime}{' '}
                    <span className="text-[10px] font-normal text-on-surface/30 uppercase">
                      @ Net Throughput
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Metadata & Action (5 cols) */}
          <div className="col-span-5 flex flex-col justify-between">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="font-space-mono text-[11px] font-bold text-on-surface/40 uppercase tracking-wider ml-1">
                    Archival Shoot Identity
                  </label>
                  <input
                    {...register('shootName')}
                    placeholder="e.g. Wildlife Expedition 2024"
                    className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] px-6 py-5 rounded-[20px] font-inter text-sm text-primary focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all placeholder:text-on-surface/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-space-mono text-[11px] font-bold text-on-surface/40 uppercase tracking-wider ml-1">
                    Primary Location
                  </label>
                  <div className="relative">
                    <input
                      {...register('locationAddress')}
                      placeholder="Add Location Metadata..."
                      className="w-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] px-6 py-5 rounded-[20px] font-inter text-sm text-primary focus:outline-none focus:ring-1 focus:ring-gallery-gold/50 transition-all placeholder:text-on-surface/20"
                    />
                    <MapPin
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-on-surface/20"
                      size={18}
                    />
                  </div>
                </div>
              </div>

              {/* Tonal Tag Preview */}
              <div className="bg-[#ff7f67]/5 p-6 rounded-[24px] border border-[#ff7f67]/10 space-y-4">
                <p className="font-space-mono text-[10px] font-bold tracking-widest text-[#901000]/40 uppercase">
                  Classification Engine
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-[#ff7f67] text-white px-3 py-1.5 rounded-lg font-space-mono text-[9px] font-bold shadow-md shadow-[#ff7f67]/20 uppercase">
                    Awaiting Curatorial Review
                  </span>
                  <span className="bg-black/5 dark:bg-white/5 text-on-surface/40 px-3 py-1.5 rounded-lg font-space-mono text-[9px] font-bold uppercase">
                    Forensic Extraction Active
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col gap-3 pt-8">
              <Button
                onClick={handleSubmit(onIngest)}
                className="w-full h-16 rounded-[24px] bg-primary-container text-on-primary-fixed hover:bg-primary-container/90 shadow-[0_20px_40px_rgba(215,153,34,0.2)] font-inter text-sm font-bold tracking-tight transition-all hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <CloudUpload size={20} />
                Start Archival Ingest
              </Button>
              <Button
                variant="ghost"
                onClick={closeWorkbench}
                className="w-full h-12 rounded-[20px] text-on-surface/40 hover:text-primary font-space-mono text-[11px] font-bold uppercase tracking-widest transition-all"
              >
                Cancel & Clear Queue
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
