'use client'

import React from 'react'

import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { cn } from '@/utilities/cn'

type FeatureItem = {
  label: string
  description: string
}

export type ProductFeatureSectionProps = {
  sectionLabel: string
  heading: string
  subheading: string
  features?: FeatureItem[]
  body?: string
  visual: React.ReactNode
  imageLeft?: boolean
  bg?: 'white' | 'surface'
  comingSoon?: boolean
}

const ComingSoonPill = () => (
  <span className="inline-flex items-center rounded-full bg-gallery-red/10 px-3 py-1 font-rubik text-[9px] tracking-[0.25em] uppercase text-gallery-red">
    Coming soon
  </span>
)

export const ProductFeatureSection: React.FC<ProductFeatureSectionProps> = ({
  sectionLabel,
  heading,
  subheading,
  features,
  body,
  visual,
  imageLeft = false,
  bg = 'white',
  comingSoon = false,
}) => {
  const textCol = (
    <div className="flex flex-col justify-center">
      <p className="mb-5 font-rubik text-[10px] tracking-[0.35em] uppercase text-gallery-red">
        {sectionLabel}
      </p>

      <h2
        className={cn(
          'mb-6 text-3xl font-extralight tracking-tight leading-[1.1] md:text-4xl lg:text-5xl',
          comingSoon ? 'text-foreground/60' : 'text-foreground',
        )}
      >
        {heading}
      </h2>

      {comingSoon && (
        <div className="mb-6">
          <ComingSoonPill />
        </div>
      )}

      <p className="mb-8 font-varela text-base leading-relaxed text-muted-foreground md:text-lg">
        {subheading}
      </p>

      {features && features.length > 0 && (
        <ul className="space-y-5">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-4">
              <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gallery-red/10">
                <div className="h-1.5 w-1.5 rounded-full bg-gallery-red" />
              </div>
              <div>
                <p className="mb-1 font-rubik text-[9px] tracking-[0.2em] uppercase text-foreground">
                  {f.label}
                </p>
                <p className="font-varela text-sm leading-relaxed text-muted-foreground">
                  {f.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {body && !features?.length && (
        <p className="font-varela text-sm leading-relaxed text-muted-foreground">{body}</p>
      )}
    </div>
  )

  const visualCol = <div className="flex items-center">{visual}</div>

  return (
    <LayoutSection className={cn(bg === 'surface' ? 'bg-[#f3f3f4]' : 'bg-white')}>
      <GutterContainer>
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">
          {imageLeft ? (
            <>
              {visualCol}
              {textCol}
            </>
          ) : (
            <>
              {textCol}
              {visualCol}
            </>
          )}
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
