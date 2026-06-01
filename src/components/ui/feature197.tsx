'use client'

import Image from 'next/image'
import { useState } from 'react'

import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/utilities/cn'

export interface FeatureItem {
  id: number
  title: string
  image: string
  description: string
}

interface Feature197Props {
  title?: string
  features: FeatureItem[]
  className?: string
}

// Active title colour per position — follows the design token palette.
const ACTIVE_COLORS = ['text-gallery-red', 'text-foreground', 'text-[#445aa5]']

const Feature197 = ({ title = 'Features', features, className }: Feature197Props) => {
  const [activeId, setActiveId] = useState<number>(features[0]?.id ?? 0)

  const activeImage = features.find((f) => f.id === activeId)?.image ?? features[0]?.image ?? ''

  return (
    <LayoutSection className={className}>
      <GutterContainer>
        <h2 className="mb-20 text-3xl font-extralight md:text-4xl tracking-tight text-center md:text-left">
          {title}
        </h2>

        <div className="flex w-full flex-col md:flex-row items-start justify-between gap-12">
          {/* Accordion */}
          <div className="w-full md:w-1/2">
            <Accordion
              type="single"
              collapsible
              defaultValue={`item-${features[0]?.id}`}
              onValueChange={(value) => {
                const feature = features.find((f) => `item-${f.id}` === value)
                if (feature) setActiveId(feature.id)
              }}
            >
              {features.map((tab, i) => (
                <AccordionItem
                  key={tab.id}
                  value={`item-${tab.id}`}
                  className="border-b last:border-b-0"
                >
                  <AccordionTrigger className="py-4 text-left no-underline hover:no-underline transition">
                    <h4
                      className={cn(
                        'text-xl md:text-2xl font-semibold transition-colors duration-300',
                        tab.id === activeId
                          ? (ACTIVE_COLORS[i % ACTIVE_COLORS.length] ?? 'text-foreground')
                          : 'text-muted-foreground',
                      )}
                    >
                      {tab.title}
                    </h4>
                  </AccordionTrigger>

                  <AccordionContent className="pb-4">
                    <p className="text-base md:text-lg text-muted-foreground font-varela leading-relaxed">
                      {tab.description}
                    </p>

                    {/* Inline image for mobile only */}
                    <div className="mt-6 md:hidden overflow-hidden rounded-[16px]">
                      <Image
                        src={tab.image}
                        alt={tab.title}
                        width={800}
                        height={600}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Desktop image panel — cross-fades between active images */}
          <div className="relative hidden w-1/2 overflow-hidden rounded-[20px] md:block aspect-[4/3]">
            {features.map((feature) => (
              <Image
                key={feature.id}
                src={feature.image}
                alt={feature.title}
                fill
                className={cn(
                  'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out',
                  activeImage === feature.image ? 'opacity-100' : 'opacity-0',
                )}
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}

export { Feature197 }
