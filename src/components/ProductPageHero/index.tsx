'use client'

import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect } from 'react'

import HubPreview from '@/assets/hub/hub_preview.webp'
import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { useHeaderTheme } from '@/providers/HeaderTheme'

export type ProductPageHeroProps = {
  heading: string
  subheading: string
  primaryLabel: string
  secondaryLabel: string
}

export const ProductPageHero: React.FC<ProductPageHeroProps> = ({
  heading,
  subheading,
  primaryLabel,
  secondaryLabel,
}) => {
  const { setHeaderTheme } = useHeaderTheme()

  useEffect(() => {
    setHeaderTheme(undefined)
  }, [setHeaderTheme])

  return (
    <LayoutSection className="bg-background overflow-hidden" bleed>
      {/* Watermark */}
      <div
        className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden pt-8"
        aria-hidden
      >
        <span className="whitespace-nowrap font-rubik text-[22vw] leading-none tracking-tighter uppercase text-foreground/[0.025]">
          PRODUCT
        </span>
      </div>

      <GutterContainer>
        {/* Text block — centered, editorial */}
        <div className="relative z-10 mx-auto max-w-3xl pt-20 pb-16 text-center md:pt-28 md:pb-20">
          <p className="mb-8 font-rubik text-[10px] tracking-[0.4em] uppercase text-gallery-red">
            Framehouse Hub
          </p>

          <h1 className="mb-8 text-4xl font-extralight tracking-tight text-foreground md:text-6xl lg:text-7xl leading-[1.05]">
            {heading}
          </h1>

          <p className="mx-auto mb-12 max-w-2xl font-varela text-base leading-relaxed text-muted-foreground md:text-lg">
            {subheading}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/create-account"
              className="rounded-full bg-gallery-gold px-8 py-3.5 font-rubik text-xs tracking-[0.15em] uppercase text-white shadow-[0_15px_30px_rgba(127,87,0,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(127,87,0,0.3)]"
            >
              {primaryLabel}
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-foreground/10 px-8 py-3.5 font-rubik text-xs tracking-[0.15em] uppercase text-foreground transition-all duration-300 hover:bg-foreground/5"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>

        {/* Platform preview — anchored to bottom of hero, bleeds slightly */}
        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-t-[24px] bg-[#f3f3f4] shadow-[0_-20px_80px_rgba(26,28,28,0.07)]">
            <Image
              src={HubPreview}
              alt="Framehouse Hub platform interface"
              className="h-auto w-full object-cover object-top"
              priority
            />
          </div>
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
