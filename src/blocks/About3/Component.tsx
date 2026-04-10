'use client'
import React from 'react'
import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from "@/components/kibo-ui/marquee"
import { Button } from "@/components/ui/button"
import { cn } from "@/utilities/cn"
import { Media as MediaComponent } from '@/components/Media'
import type { About3Block as About3BlockProps } from '@/payload-types'
import { motion } from 'framer-motion'

export const About3Block: React.FC<About3BlockProps> = (props) => {
  const {
    title,
    description,
    mainImage,
    secondaryImage,
    breakout,
    companies,
    achievementsTitle,
    achievementsDescription,
    achievements,
    contentSections,
  } = props

  return (
    <section className="py-16 md:py-32 bg-white dark:bg-[#1a1c1c]">
      <div className="container">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-5 lg:w-2/3">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              className="text-5xl font-rubik tracking-tighter lg:text-7xl uppercase"
            >
              {title}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
              className="text-lg text-neutral-500 dark:text-neutral-400 md:text-xl max-w-2xl leading-relaxed"
            >
              {description}
            </motion.p>
        </div>

        {/* Hero Grid */}
        <div className="grid gap-7 lg:grid-cols-3">
          <div className="lg:col-span-2 overflow-hidden rounded-[24px]">
            {mainImage && (
              <MediaComponent 
                resource={mainImage} 
                className="w-full h-full min-h-[400px] max-h-[620px] object-cover" 
              />
            )}
          </div>
          
          <div className="flex flex-col gap-7 md:flex-row lg:flex-col">
            {/* Breakout Card */}
            <div className="flex flex-col justify-between gap-6 rounded-[24px] bg-[#f3f3f4] dark:bg-[#252828] p-7 md:w-1/2 lg:w-auto hover:bg-[#ececeec] dark:hover:bg-[#2a2d2d] transition-colors duration-500">
              {breakout?.logo && (
                <div className="h-12 w-auto flex items-center">
                   <MediaComponent 
                    resource={breakout.logo} 
                    className="h-full w-auto object-contain dark:invert grayscale brightness-0 opacity-40" 
                  />
                </div>
              )}
              <div>
                <p className="mb-2 text-lg font-semibold tracking-tight">{breakout?.title}</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">{breakout?.description}</p>
              </div>
              {breakout?.buttonText && (
                <Button variant="outline" className="mr-auto rounded-full font-rubik text-[10px] uppercase tracking-[0.2em]" asChild>
                  <a href={breakout.buttonUrl || '#'}>
                    {breakout.buttonText}
                  </a>
                </Button>
              )}
            </div>
            
            {/* Secondary Image */}
            <div className="grow basis-0 rounded-[24px] overflow-hidden md:w-1/2 lg:min-h-0 lg:w-auto">
              {secondaryImage && (
                <MediaComponent 
                  resource={secondaryImage} 
                  className="w-full h-full object-cover" 
                />
              )}
            </div>
          </div>
        </div>

        {/* Logo Wall */}
        {companies && companies.length > 0 && (
          <div className="py-24 md:py-32">
            <Marquee>
              <MarqueeContent speed={40}>
                {companies.map((item, idx) => (
                  <MarqueeItem
                    key={idx}
                    className="mx-12 flex items-center opacity-40 hover:opacity-100 transition-opacity duration-700 grayscale hover:grayscale-0"
                  >
                    {item.logo && (
                      <MediaComponent 
                        resource={item.logo} 
                        className="h-7 md:h-8 w-auto object-contain dark:invert" 
                      />
                    )}
                  </MarqueeItem>
                ))}
              </MarqueeContent>
              <MarqueeFade side="left" className="from-white dark:from-[#1a1c1c] to-transparent backdrop-blur-[20px]" />
              <MarqueeFade side="right" className="from-transparent to-white dark:to-[#1a1c1c] backdrop-blur-[20px]" />
            </Marquee>
          </div>
        )}

        {/* Achievements */}
        <div className="relative overflow-hidden rounded-[24px] bg-[#f3f3f4] dark:bg-[#252828] p-7 md:p-16">
          <div className="flex flex-col gap-4 text-center md:text-left">
            <h2 className="text-3xl font-rubik tracking-tighter uppercase md:text-5xl">
              {achievementsTitle}
            </h2>
            <p className="max-w-xl text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {achievementsDescription}
            </p>
          </div>
          <div className="mt-16 md:mt-24 grid grid-cols-2 gap-x-4 gap-y-12 md:flex md:flex-wrap md:justify-between">
            {achievements?.map((item, idx) => (
              <div
                className="flex flex-col gap-2 text-center md:text-left"
                key={idx}
              >
                <span className="font-rubik text-4xl md:text-6xl tracking-tighter uppercase leading-none">
                  {item.value}
                </span>
                <p className="text-xs md:text-sm font-mono uppercase tracking-[0.4em] text-neutral-400">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Content Sections */}
        {contentSections && contentSections.length > 0 && (
          <div className="mx-auto grid max-w-5xl gap-16 py-24 md:grid-cols-2 md:gap-32 md:py-48">
            {contentSections.map((section, idx) => (
              <div key={idx} className="flex flex-col gap-6">
                <h2 className="text-xs font-rubik uppercase tracking-[0.4em] text-primary">
                  {section.title}
                </h2>
                <p className="text-lg leading-relaxed text-neutral-500 dark:text-neutral-400 whitespace-pre-line font-inter">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
致
