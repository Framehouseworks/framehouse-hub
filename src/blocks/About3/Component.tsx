'use client'
import React from 'react'
import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from "@/components/kibo-ui/marquee"
import { Button } from "@/components/ui/button"
// import { cn } from '@/utilities/cn'
import { Media as MediaComponent } from '@/components/Media'
import type { About3Block as About3BlockProps } from '@/payload-types'
// import { lexicalEditor } from '@payloadcms/richtext-lexical'
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
    <section className="py-24 md:py-48 bg-white dark:bg-[#1a1c1c] overflow-hidden">
      <div className="container">
        {/* Header */}
        <div className="mb-20 flex flex-col gap-8 lg:w-2/3">
            <motion.h1 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
              className="text-6xl font-rubik tracking-tighter lg:text-8xl uppercase leading-[0.9]"
            >
              {title}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 1, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
              className="text-xl text-on_surface/70 dark:text-on_surface/50 md:text-2xl max-w-2xl leading-relaxed font-inter"
            >
              {description}
            </motion.p>
        </div>

        {/* Hero Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
            className="lg:col-span-2 overflow-hidden rounded-[24px] bg-[#f3f3f4] dark:bg-[#252828] border border-black/5 dark:border-white/5"
          >
            {mainImage && (
              <MediaComponent 
                resource={mainImage} 
                className="w-full h-full min-h-[400px] max-h-[700px] object-cover grayscale hover:grayscale-0 transition-all duration-1000 ease-[0.23,1,0.32,1]" 
              />
            )}
          </motion.div>
          
          <div className="flex flex-col gap-8 md:flex-row lg:flex-col">
            {/* Breakout Card - Glassmorphism applied */}
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 1, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col justify-between gap-8 rounded-[24px] bg-white/70 dark:bg-[#252828]/70 backdrop-blur-[20px] border border-black/5 dark:border-white/5 p-8 md:w-1/2 lg:w-auto hover:bg-white dark:hover:bg-[#2a2d2d] transition-colors duration-700 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]"
            >
              {breakout?.logo && (
                <div className="h-12 w-auto flex items-center">
                   <MediaComponent 
                    resource={breakout.logo} 
                    className="h-full w-auto object-contain dark:invert grayscale opacity-30" 
                  />
                </div>
              )}
              <div>
                <p className="mb-3 text-xl font-semibold tracking-tight leading-tight">{breakout?.title}</p>
                <p className="text-on_surface/60 dark:text-on_surface/40 text-sm leading-relaxed font-inter">{breakout?.description}</p>
              </div>
              {breakout?.buttonText && (
                <Button variant="outline" className="mr-auto rounded-full font-rubik text-[10px] uppercase tracking-[0.2em] h-10 px-8" asChild>
                  <a href={breakout.buttonUrl || '#'}>
                    {breakout.buttonText}
                  </a>
                </Button>
              )}
            </motion.div>
            
            {/* Secondary Image */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 1, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="grow basis-0 rounded-[24px] overflow-hidden md:w-1/2 lg:min-h-0 lg:w-auto border border-black/5 dark:border-white/5"
            >
              {secondaryImage && (
                <MediaComponent 
                  resource={secondaryImage} 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000 ease-[0.23,1,0.32,1]" 
                />
              )}
            </motion.div>
          </div>
        </div>

        {/* Logo Wall */}
        {companies && companies.length > 0 && (
          <div className="py-32 md:py-48 border-y border-black/5 dark:border-white/5 my-24">
            <Marquee>
              <MarqueeContent speed={40}>
                {companies.map((item, idx) => {
                  return (
                    <MarqueeItem
                      key={idx}
                      className="mx-16 flex items-center opacity-30 hover:opacity-100 transition-opacity duration-700 grayscale hover:grayscale-0"
                    >
                      {item.logo && (
                        <MediaComponent 
                          resource={item.logo} 
                          className="h-8 md:h-10 w-auto object-contain dark:invert" 
                        />
                      )}
                    </MarqueeItem>
                  )
                })}
              </MarqueeContent>
              <MarqueeFade side="left" className="from-white dark:from-[#1a1c1c] to-transparent backdrop-blur-[20px]" />
              <MarqueeFade side="right" className="from-transparent to-white dark:to-[#1a1c1c] backdrop-blur-[20px]" />
            </Marquee>
          </div>
        )}

        {/* Achievements */}
        <motion.div 
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="relative overflow-hidden rounded-[32px] bg-[#f3f3f4] dark:bg-[#252828] p-10 md:p-24"
        >
          <div className="flex flex-col gap-6 text-center md:text-left max-w-3xl">
            <h2 className="text-4xl font-rubik tracking-tighter uppercase md:text-6xl leading-[0.9]">
              {achievementsTitle}
            </h2>
            <p className="text-lg md:text-xl text-on_surface/60 dark:text-on_surface/40 leading-relaxed font-inter">
              {achievementsDescription}
            </p>
          </div>
          <div className="mt-20 md:mt-32 grid grid-cols-2 gap-x-8 gap-y-16 md:flex md:flex-wrap md:justify-between">
            {achievements?.map((item, idx) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: idx * 0.1, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col gap-3 text-center md:text-left"
                key={idx}
              >
                <span className="font-rubik text-5xl md:text-8xl tracking-tighter uppercase leading-none text-primary">
                  {item.value}
                </span>
                <p className="text-[10px] md:text-xs font-rubik uppercase tracking-[0.4em] text-on_surface/40 dark:text-on_surface/30">
                  {item.label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Content Sections */}
        {contentSections && contentSections.length > 0 && (
          <div className="mx-auto grid max-w-6xl gap-20 py-32 md:grid-cols-2 md:gap-40 md:py-56">
            {contentSections.map((section, idx) => (
              <motion.div 
                key={idx} 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ duration: 1, delay: idx * 0.1, ease: [0.23, 1, 0.32, 1] }}
                className="flex flex-col gap-8"
              >
                {section.media && (
                  <div className="mb-4 overflow-hidden rounded-[24px] border border-black/5 dark:border-white/5 bg-neutral-100/30 dark:bg-neutral-800/20 p-2 lg:p-4">
                    <MediaComponent 
                      resource={section.media} 
                      className="w-full h-auto aspect-video object-cover grayscale hover:grayscale-0 transition-all duration-1000 ease-[0.23,1,0.32,1]" 
                    />
                  </div>
                )}
                <h2 className="text-xs font-rubik uppercase tracking-[0.5em] text-primary/80">
                  {section.title}
                </h2>
                <p className="text-xl md:text-2xl leading-[1.6] text-on_surface/80 dark:text-on_surface/60 whitespace-pre-line font-inter font-light tracking-tight">
                  {section.content}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

