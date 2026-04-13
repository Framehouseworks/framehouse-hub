'use client'
import { cn } from '@/utilities/cn'
import React, { useRef } from 'react'
import { RichText } from '@/components/RichText'
import type { DefaultDocumentIDType } from 'payload'
import type { ContentBlock as ContentBlockProps } from '@/payload-types'
import { motion, useInView } from 'framer-motion'

import { CMSLink } from '../../components/Link'
import { Media as MediaComponent } from '@/components/Media'

export const ContentBlock: React.FC<
  ContentBlockProps & {
    id?: DefaultDocumentIDType
    className?: string
  }
> = (props) => {
  const { columns, style, backgroundColor, layoutStyle, className } = props
  const containerRef = useRef(null)
  const isInView = useInView(containerRef, { once: true, margin: '-10%' })

  const bgClasses = {
    white: 'bg-white dark:bg-[#1a1c1c]',
    surface_low: 'bg-[#f3f3f4] dark:bg-[#252828]',
  }

  const colsSpanClasses = {
    full: '12',
    half: '6',
    oneThird: '4',
    twoThirds: '8',
  }

  const sectionClasses = cn(
    'py-24 md:py-32 xl:py-48 overflow-hidden',
    bgClasses[backgroundColor || 'white'],
    className
  )

  if (style === 'mission') {
    return (
      <section className={sectionClasses} ref={containerRef}>
        <div className="container">
          <div className="max-w-[1100px] mx-auto text-center">
            {columns?.map((col, index) => {
              const { richText, enableLink, link } = col
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-10%' }}
                  transition={{
                    duration: 1,
                    delay: index * 0.1,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className={cn(
                    "flex flex-col items-center",
                    "[&_h1]:text-6xl [&_h1]:md:text-8xl [&_h1]:lg:text-9xl [&_h1]:font-rubik [&_h1]:tracking-tighter [&_h1]:uppercase [&_h1]:mb-12 [&_h1]:leading-[0.9]",
                    "[&_p]:text-xl [&_p]:md:text-3xl [&_p]:text-on_surface/60 [&_p]:dark:text-on_surface/40 [&_p]:max-w-[850px] [&_p]:mx-auto [&_p]:leading-[1.4] font-inter"
                  )}
                >
                  {richText && <RichText data={richText} enableGutter={false} enableProse={false} />}
                  {enableLink && (
                    <div className="mt-16">
                      <CMSLink {...link} appearance="outline" className="font-rubik text-[10px] uppercase tracking-[0.4em] h-12 px-10 rounded-full" />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={sectionClasses}>
      <div className="container">
        <div className="grid grid-cols-4 lg:grid-cols-12 gap-y-24 lg:gap-y-12 gap-x-16 lg:gap-x-24 items-center">
          {columns &&
            columns.length > 0 &&
            columns.map((col, index) => {
              const { enableLink, link, richText, size } = col
              const isSideBySide = layoutStyle === 'side_by_side'
              const isFirstInAsymmetric = layoutStyle === 'asymmetric' && index === 0
              const isFirstInSideBySide = isSideBySide && index === 0

              return (
                <div
                  className={cn(
                    'flex flex-col justify-center min-h-full',
                    {
                      'col-span-12 lg:col-span-4': isFirstInAsymmetric,
                      'col-span-12 lg:col-span-8': layoutStyle === 'asymmetric' && index !== 0,
                      'col-span-12 lg:col-span-5': isFirstInSideBySide,
                      'col-span-12 lg:col-span-7 font-inter': isSideBySide && index !== 0,
                      [`col-span-12 lg:col-span-${colsSpanClasses[size!]}`]:
                        layoutStyle !== 'asymmetric' && !isSideBySide,
                    },
                    (isFirstInAsymmetric || isFirstInSideBySide) &&
                      '[&_p]:font-mono [&_p]:text-[10px] [&_p]:uppercase [&_p]:tracking-[0.4em] [&_p]:text-primary/70 text-center lg:text-left dark:[&_p]:text-primary/50'
                  )}
                  key={index}
                >
                  {col.media && (
                    <div className="mb-14 overflow-hidden rounded-[24px] border border-black/5 dark:border-white/5 bg-neutral-100/30 dark:bg-neutral-800/20 p-2 lg:p-4 shadow-sm hover:shadow-xl transition-shadow duration-1000">
                      {typeof col.media === 'string' ? (
                        <img 
                          src={col.media} 
                          alt="Placeholder" 
                          className={cn(
                            "w-full h-auto max-h-[600px] object-cover grayscale hover:grayscale-0 transition-all duration-1000 ease-[0.23,1,0.32,1]",
                            isSideBySide && "aspect-video"
                          )} 
                        />
                      ) : (
                        <MediaComponent 
                          resource={col.media} 
                          className={cn(
                            "w-full h-auto max-h-[600px] object-cover grayscale hover:grayscale-0 transition-all duration-1000 ease-[0.23,1,0.32,1]",
                            isSideBySide && "aspect-video"
                          )} 
                        />
                      )}
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-15%' }}
                    transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                    className={cn(
                      isSideBySide && index !== 0 && "lg:text-2xl lg:leading-[1.7] text-on_surface/80 dark:text-on_surface/60 font-light tracking-tight"
                    )}
                  >
                    {richText && <RichText data={richText} enableGutter={false} />}
                  </motion.div>

                  {enableLink && (
                    <div className="mt-14">
                      <CMSLink {...link} appearance="outline" className="font-rubik text-[10px] uppercase tracking-[0.4em] h-12 px-10 rounded-full" />
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    </section>
  )
}
