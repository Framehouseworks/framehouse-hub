import type { Media, ThreeItemGridBlock as ThreeItemGridBlockProps } from '@/payload-types'

import { GridTileImage } from '@/components/Grid/tile'
import type { DefaultDocumentIDType } from 'payload'
import React from 'react'

type Props = { item: Media; priority?: boolean; size: 'full' | 'half' }

export const ThreeItemGridItem: React.FC<Props> = ({ item, size }) => {
  return (
    <div
      className={size === 'full' ? 'md:col-span-4 md:row-span-2' : 'md:col-span-2 md:row-span-1'}
    >
      <div className="relative block aspect-square h-full w-full">
        <GridTileImage
          label={{
            amount: 0,
            position: size === 'full' ? 'center' : 'bottom',
            title: item.alt || item.filename || '',
          }}
          media={item}
        />
      </div>
    </div>
  )
}

export const ThreeItemGridBlock: React.FC<
  ThreeItemGridBlockProps & {
    id?: DefaultDocumentIDType
    className?: string
  }
> = async ({ media }) => {
  if (!media || !media[0] || !media[1] || !media[2]) return null

  const items = media.map((m) => (typeof m === 'object' ? m : null)).filter(Boolean) as Media[]

  if (items.length < 3) return null

  return (
    <section className="container grid gap-4 pb-4 md:grid-cols-6 md:grid-rows-2">
      <ThreeItemGridItem item={items[0]} priority size="full" />
      <ThreeItemGridItem item={items[1]} priority size="half" />
      <ThreeItemGridItem item={items[2]} size="half" />
    </section>
  )
}
