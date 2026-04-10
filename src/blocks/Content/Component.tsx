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
    'py-12 md:py-24 overflow-hidden',
    bgClasses[backgroundColor || 'white'],
    className
  )

  if (style === 'mission') {
    return (
      <section className={sectionClasses} ref={containerRef}>
        <div className="container">
          <div className="max-w-[1000px] mx-auto text-center">
            {columns?.map((col, index) => {
              const { richText, enableLink, link } = col
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-10%' }}
                  transition={{
                    duration: 0.8,
                    delay: index * 0.1,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className={cn(
                    "flex flex-col items-center",
                    "[&_h1]:text-5xl [&_h1]:md:text-7xl [&_h1]:lg:text-8xl [&_h1]:font-rubik [&_h1]:tracking-tighter [&_h1]:uppercase [&_h1]:mb-8",
                    "[&_p]:text-xl [&_p]:md:text-2xl [&_p]:text-neutral-500 [&_p]:dark:text-neutral-300 [&_p]:max-w-[800px] [&_p]:mx-auto [&_p]:leading-relaxed"
                  )}
                >
                  {richText && <RichText data={richText} enableGutter={false} enableProse={false} />}
                  {enableLink && (
                    <div className="mt-12">
                      <CMSLink {...link} appearance="outline" className="font-rubik text-xs uppercase tracking-[0.2em]" />
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
        <div className="grid grid-cols-4 lg:grid-cols-12 gap-y-12 gap-x-16">
          {columns &&
            columns.length > 0 &&
            columns.map((col, index) => {
              const { enableLink, link, richText, size } = col
              const isFirstInAsymmetric = layoutStyle === 'asymmetric' && index === 0

              return (
                <div
                  className={cn(
                    {
                      'col-span-4 lg:col-span-4': isFirstInAsymmetric,
                      'col-span-4 lg:col-span-8': layoutStyle === 'asymmetric' && index !== 0,
                      [`col-span-4 lg:col-span-${colsSpanClasses[size!]}`]: layoutStyle !== 'asymmetric',
                      'md:col-span-2': layoutStyle !== 'asymmetric' && size !== 'full',
                    },
                    isFirstInAsymmetric && "[&_p]:font-mono [&_p]:text-[10px] [&_p]:uppercase [&_p]:tracking-[0.2em] [&_p]:text-primary/40"
                  )}
                  key={index}
                >
                  {col.media && (
                    <div className="mb-8 overflow-hidden rounded-xl border border-black/5 dark:border-white/5 bg-neutral-100/50 dark:bg-neutral-800/20 p-4 md:p-8">
                      <MediaComponent resource={col.media} className="w-full h-auto max-h-[440px] object-contain grayscale hover:grayscale-0 transition-all duration-700 ease-[0.23,1,0.32,1]" />
                    </div>
                  )}
                  {richText && <RichText data={richText} enableGutter={false} />}

                  {enableLink && (
                    <div className="mt-8">
                      <CMSLink {...link} appearance="outline" className="font-rubik text-xs uppercase tracking-[0.2em]" />
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
