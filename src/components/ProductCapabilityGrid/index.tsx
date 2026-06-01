'use client'

import { FolderOpen, Grid2x2, Share2, UploadCloud } from 'lucide-react'
import React from 'react'

import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { cn } from '@/utilities/cn'

const ICON_MAP: Record<string, React.ElementType> = {
  upload: UploadCloud,
  folder: FolderOpen,
  grid: Grid2x2,
  share: Share2,
}

const ACCENT_CLASSES: string[] = [
  'bg-gallery-red/10 text-gallery-red',
  'bg-[#445aa5]/10 text-[#445aa5]',
  'bg-gallery-gold/10 text-gallery-gold',
  'bg-gallery-red/10 text-gallery-red',
]

type CapabilityItem = {
  label: string
  description: string
  icon: string
}

export type ProductCapabilityGridProps = {
  heading: string
  items: CapabilityItem[]
}

export const ProductCapabilityGrid: React.FC<ProductCapabilityGridProps> = ({
  heading,
  items,
}) => {
  return (
    <LayoutSection className="bg-[#f3f3f4]">
      <GutterContainer>
        <h2 className="mb-16 text-center text-3xl font-extralight tracking-tight text-foreground md:mb-20 md:text-4xl">
          {heading}
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = ICON_MAP[item.icon] ?? UploadCloud
            const accent = ACCENT_CLASSES[i % ACCENT_CLASSES.length]

            return (
              <div
                key={i}
                className="flex flex-col rounded-[20px] bg-white p-8 shadow-[0_20px_40px_rgba(26,28,28,0.04)]"
              >
                <div
                  className={cn(
                    'mb-6 flex h-10 w-10 items-center justify-center rounded-full',
                    accent,
                  )}
                >
                  <Icon size={18} strokeWidth={1.5} />
                </div>

                <p className="mb-3 font-rubik text-[10px] tracking-[0.25em] uppercase text-foreground">
                  {item.label}
                </p>

                <p className="font-varela text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
