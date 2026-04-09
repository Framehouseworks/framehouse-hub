'use client'
import HeroImage from '@/assets/hub/hero_image.png'
import { LoginForm } from '@/components/login-form'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import Image, { StaticImageData } from 'next/image'
import { useEffect } from 'react'
import React from 'react'

import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'

export type LandingHeroProps = {
  title?: React.ReactNode
  description?: string
  image?: StaticImageData
}

export const DEFAULT_CONTENT: Required<LandingHeroProps> = {
  title: (
    <>
      Store it properly. <br />
      <span>Share it effortlessly</span>
    </>
  ),
  description: 'Manage, organise, and share your assets in a single source of truth with Framehouse Hub, the platform built for independent creatives.',
  image: HeroImage,
}

export const LandingHero: React.FC<LandingHeroProps> = (props) => {
  const { 
    title = DEFAULT_CONTENT.title, 
    description = DEFAULT_CONTENT.description, 
    image = DEFAULT_CONTENT.image 
  } = props
  
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    // Rendering the header consistently on top of the hero
    setHeaderTheme(undefined)
  }, [setHeaderTheme])

  return (
    <LayoutSection className="min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden bg-background" bleed>
      {/* Background "HUB" Typography */}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-7/15 pointer-events-none select-none z-0"
        aria-hidden="true"
      >
        <div className="rotate-[-90deg] flex items-center justify-center">
          <span className="text-[35vh] md:text-[40vh] font-rubik leading-none tracking-tighter uppercase text-transparent bg-clip-text bg-linear-to-r from-[#14192A] via-[#14192A] via-50% to-[#C5CBE3] opacity-100 dark:opacity-25 transition-opacity duration-500">
            HUB
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-0 min-h-screen w-full relative z-10">
        {/* Column 1: Content */}
        <div className="flex flex-col items-center xl:items-end text-center justify-start xl:justify-center">
          <GutterContainer leftAlign className="w-full flex flex-col items-center xl:items-end">
            <div className="max-w-xl w-full">
              <h1 className="text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.1] transition-all duration-300 font-sans bg-linear-to-b from-[#F13C1F] via-[#F13C1F] via-60% to-transparent bg-clip-text text-transparent py-2">
                {title}
              </h1>
              <p className="mt-8 text-lg md:text-xl font-varela text-muted-foreground w-full leading-relaxed">
                {description}
              </p>

              <div className="mt-12 w-full max-w-md mx-auto transform transition-all duration-500">
                <LoginForm className="shadow-none border-none bg-transparent" />
              </div>
            </div>
          </GutterContainer>
        </div>

        {/* Column 2: Image */}
        <div className="hidden lg:flex w-full h-full relative items-center justify-end overflow-hidden">
          <div className="relative w-full h-full flex justify-end items-center translate-x-12">
            <Image
              src={image}
              alt="Framehouse Hub Platform Preview"
              className="object-contain object-right h-[85vh] w-auto drop-shadow-[-20px_20px_50px_rgba(0,0,0,0.15)] dark:drop-shadow-[-20px_20px_50px_rgba(255,255,255,0.05)] transition-transform duration-700 hover:scale-[1.02]"
              priority
            />
          </div>
        </div>
      </div>
    </LayoutSection>
  )
}
