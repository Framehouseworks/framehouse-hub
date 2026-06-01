'use client'
import { useEffect } from 'react'
import React from 'react'

import { LoginForm } from '@/components/login-form'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { HeroGraphic } from './HeroGraphic'

export type LandingHeroProps = {
  title?: React.ReactNode
  description?: string
}

export const DEFAULT_CONTENT: Required<LandingHeroProps> = {
  title: (
    <>
      Store it properly. <br />
      <span>Share it effortlessly</span>
    </>
  ),
  description:
    'Manage, organise, and share your assets in a single source of truth with Framehouse Hub, the platform built for independent creatives.',
}

export const LandingHero: React.FC<LandingHeroProps> = (props) => {
  const { title = DEFAULT_CONTENT.title, description = DEFAULT_CONTENT.description } = props

  const { setHeaderTheme } = useHeaderTheme()
  useEffect(() => {
    setHeaderTheme(undefined)
  }, [setHeaderTheme])

  return (
    <LayoutSection
      className="-mt-24 sm:-mt-32 min-h-screen flex items-center justify-center overflow-hidden bg-background"
      bleed
    >
      {/* Background "HUB" watermark — rotated vertical, anchored to left edge.
          Section is min-h-screen (cancels main pt-24/pt-32 via negative margin) so
          font-size calc only needs viewport height, not header offset.
          Text rendered width ≈ font-size × 2.06 (Rubik Mono One "HUB" + tracking-tighter).
          Target width = 100vh − 48px (24px breathing room each side).
          translateX(-47%) shifts the strip left so ~30% peeks from the left edge. */}
      <div
        className="absolute left-0 top-1/2 pointer-events-none select-none z-0"
        style={{ transform: 'translateY(-50%) translateX(-47%)' }}
        aria-hidden="true"
      >
        <span
          className="block font-rubik leading-none tracking-tighter uppercase text-transparent bg-clip-text bg-linear-to-r from-[#14192A] via-[#14192A] via-50% to-[#C5CBE3] opacity-100 dark:opacity-25 transition-opacity duration-500 whitespace-nowrap"
          style={{
            fontSize: 'calc((100vh - 48px) / 2.06)',
            transform: 'rotate(-90deg)',
          }}
        >
          HUB
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen w-full relative z-10">
        {/* Column 1: Content */}
        <div className="flex flex-col items-center xl:items-end text-center justify-center">
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

        {/* Column 2: Static graphic */}
        <div className="hidden lg:flex w-full h-full relative items-center justify-center overflow-hidden">
          <HeroGraphic />
        </div>
      </div>
    </LayoutSection>
  )
}
