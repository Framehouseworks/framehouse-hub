'use client'

import type { Media } from '@/payload-types'
import { cn } from '@/utilities/cn'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, MapPin, Zap } from 'lucide-react'
import Image from 'next/image'
import React from 'react'

interface Props {
  media: Media
}

export const MediaCard: React.FC<Props> = ({ media }) => {
  const [isHovered, setIsHovered] = React.useState(false)

  const title = media.alt || media.filename || 'Untitled Archive'
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const src = media.url?.startsWith('http') ? media.url : `${serverUrl}${media.url}`

  const hasTechnical = !!(media.technical?.cameraModel || media.technical?.iso)
  const isProcessing = media.ingestionStatus === 'processing' || media.ingestionStatus === 'active'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative aspect-[4/5] rounded-[24px] bg-gallery-surface dark:bg-[#0a0c10] overflow-hidden border border-black/[0.03] dark:border-white/[0.03] shadow-sm hover:shadow-xl transition-all duration-500"
    >
      {/* 1. Primary Asset */}
      {media.url && (
        <Image
          src={src}
          alt={title}
          fill
          unoptimized
          className={cn(
            'object-cover transition-all duration-700',
            isHovered ? 'blur-[2px] opacity-40' : 'opacity-100',
          )}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />
      )}

      {/* 2. Top Badges (Status & Tags) */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-10">
        <div className="flex flex-wrap gap-2">
          {isProcessing ? (
            <div className="px-3 py-1 rounded-full bg-gallery-gold/10 backdrop-blur-md border border-gallery-gold/20 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gallery-gold animate-pulse" />
              <span className="font-rubik text-[9px] tracking-wider text-gallery-gold uppercase">
                Processing
              </span>
            </div>
          ) : (
            media.manualTags?.[0] && (
              <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                <span className="font-rubik text-[9px] tracking-wider text-white uppercase opacity-80">
                  {media.manualTags[0].tag}
                </span>
              </div>
            )
          )}
        </div>

        {hasTechnical && (
          <div className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/60">
            <Zap size={14} />
          </div>
        )}
      </div>

      {/* 3. Hover Overlay: Technical Pedigree */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col justify-end p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white"
          >
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              {/* Technical Group */}
              {hasTechnical && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gallery-gold">
                    <Camera size={14} />
                    <span className="text-[10px] font-bold tracking-widest uppercase font-rubik">
                      Technical Data
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                    {media.technical?.cameraModel && (
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase font-rubik">Body</span>
                        <span className="text-[11px] font-medium truncate">
                          {media.technical.cameraModel}
                        </span>
                      </div>
                    )}
                    {media.technical?.iso && (
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase font-rubik">ISO</span>
                        <span className="text-[11px] font-medium">{media.technical.iso}</span>
                      </div>
                    )}
                    {media.technical?.aperture && (
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase font-rubik">
                          Aperture
                        </span>
                        <span className="text-[11px] font-medium">
                          f/{media.technical.aperture}
                        </span>
                      </div>
                    )}
                    {media.technical?.shutterSpeed && (
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase font-rubik">
                          Shutter
                        </span>
                        <span className="text-[11px] font-medium">
                          {media.technical.shutterSpeed}s
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location Badge */}
              {media.location?.address && (
                <div className="flex items-center gap-2 text-white/60">
                  <MapPin size={12} />
                  <span className="text-[10px] font-medium truncate">{media.location.address}</span>
                </div>
              )}

              {/* Title & Metadata */}
              <div className="pt-2 border-t border-white/10">
                <h3 className="text-sm font-semibold truncate mb-1">{title}</h3>
                <div className="flex items-center gap-3 text-[10px] text-white/40 font-varela">
                  <span>
                    {media.width} &times; {media.height}
                  </span>
                  <span>{((media.filesize || 0) / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Bottom Identity (Default View) */}
      <AnimatePresence>
        {!isHovered && (
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10 ">
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white/90 dark:bg-black/60 p-4 backdrop-blur-xl rounded-2xl shadow-sm"
            >
              <h3 className="text-xs font-semibold text-primary truncate mb-1 font-rubik">
                {title}
              </h3>
              <p className="text-[10px] text-on-surface/40 font-varela truncate uppercase tracking-wider">
                {media.mediaType || 'Image'} &bull; {new Date(media.createdAt).toLocaleDateString()}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
