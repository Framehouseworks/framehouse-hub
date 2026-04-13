'use client'
import type { Media, ThreeItemGridBlock as ThreeItemGridBlockProps } from '@/payload-types'
import { cn } from '@/utilities/cn'
import { motion, useInView } from 'framer-motion'
import React, { useRef } from 'react'

import { CMSLink } from '@/components/Link'
import { Media as MediaComponent } from '@/components/Media'

export const ThreeItemGridBlock: React.FC<
  ThreeItemGridBlockProps & {
    id?: string
    className?: string
  }
> = (props) => {
  const { media, style, items: itemsData, backgroundColor, className } = props
  const containerRef = useRef(null)
  const isInView = useInView(containerRef, { once: true, margin: '-10%' })

  const bgClasses = {
    white: 'bg-white dark:bg-[#1a1c1c]',
    surface_low: 'bg-[#f3f3f4] dark:bg-[#252828]',
  }

  const sectionClasses = cn(
    'py-12 md:py-24 overflow-hidden',
    bgClasses[backgroundColor || 'white'],
    className
  )

  // 1. Pillars (Shelf) Layout
  if (style === 'pillars' && itemsData && itemsData.length > 0) {
    return (
      <section className={sectionClasses} ref={containerRef}>
        <div className="container">
          <div className="flex flex-col gap-12 md:gap-24">
            {itemsData.map((item, i) => {
              const indexStr = (i + 1).toString().padStart(2, '0')
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.8,
                    delay: i * 0.1,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                className="group relative grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-start"
              >
                {/* 01 Index */}
                <div className="md:col-span-1">
                  <span className="font-mono text-xl md:text-2xl tracking-[0.4em] text-primary/20 group-hover:text-primary transition-colors duration-700 ease-[0.23,1,0.32,1]">
                    {indexStr}
                  </span>
                </div>

                {/* Content */}
                <div className="md:col-span-6 flex flex-col gap-4">
                  <h3 className="text-3xl md:text-5xl font-rubik tracking-tighter uppercase leading-none">
                    {item.title}
                  </h3>
                  <p className="text-lg md:text-xl text-neutral-500 dark:text-neutral-400 max-w-[500px] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Media Shelf */}
                <div className="md:col-span-5 h-[200px] md:h-[300px] w-full opacity-100 group-hover:opacity-100 saturate-[0.2] group-hover:saturate-100 transition-all duration-700 ease-[0.23,1,0.32,1] overflow-hidden rounded-xl border border-black/5 dark:border-white/5 bg-neutral-100 dark:bg-neutral-800/50">
                  {item.media && (
                    <MediaComponent
                      resource={item.media}
                      className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-1000 ease-[0.23,1,0.32,1]"
                    />
                  )}
                </div>

                {/* Bottom Border */}
                <div className="absolute -bottom-6 md:-bottom-12 left-0 right-0 h-px bg-neutral-100 dark:bg-neutral-800 last-of-type:hidden" />
              </motion.div>
            )
          })}
          </div>
        </div>
      </section>
    )
  }

  // 2. Default (Gallery) Layout
  const gridMedia = media?.map((m) => (typeof m === 'object' ? m : null)).filter(Boolean) as Media[]
  if (!gridMedia || gridMedia.length < 3) return null

  return (
    <section className={sectionClasses}>
      <div className="container grid gap-4 pb-4 md:grid-cols-6 md:grid-rows-2">
        <div className="md:col-span-4 md:row-span-2 relative aspect-square">
          <MediaComponent resource={gridMedia[0]} className="w-full h-full object-cover rounded-xl" />
        </div>
        <div className="md:col-span-2 md:row-span-1 relative aspect-square">
          <MediaComponent resource={gridMedia[1]} className="w-full h-full object-cover rounded-xl" />
        </div>
        <div className="md:col-span-2 md:row-span-1 relative aspect-square">
          <MediaComponent resource={gridMedia[2]} className="w-full h-full object-cover rounded-xl" />
        </div>
      </div>
    </section>
  )
}
