'use client'
import type { Media } from '@/payload-types'

import { GridTileImage } from '@/components/Grid/tile'
import { Media as MediaComponent } from '@/components/Media'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { cn } from '@/utilities/cn'
import AutoScroll from 'embla-carousel-auto-scroll'
import React from 'react'

export const CarouselClient: React.FC<{ products: Media[]; style?: 'default' | 'logoWall' }> = ({
  products,
  style = 'default',
}) => {
  if (!products?.length) return null

  // Purposefully duplicating products to make the carousel loop and not run out of products on wide screens.
  const carouselProducts = [...products, ...products, ...products]

  const isLogoWall = style === 'logoWall'

  return (
    <Carousel
      className="w-full"
      opts={{ align: 'start', loop: true }}
      plugins={[
        AutoScroll({
          playOnInit: true,
          speed: isLogoWall ? 0.8 : 1,
          stopOnInteraction: false,
          stopOnMouseEnter: true,
        }),
      ]}
    >
      <CarouselContent className={isLogoWall ? '-ml-8' : ''}>
        {carouselProducts.map((media, i) => (
          <CarouselItem
            className={cn(
              isLogoWall
                ? 'pl-8 basis-1/2 md:basis-1/4 lg:basis-1/6 flex items-center justify-center h-24 opacity-20 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-700 ease-[0.23,1,0.32,1]'
                : 'relative aspect-square h-[30vh] max-h-[275px] w-2/3 max-w-[475px] flex-none md:w-1/3'
            )}
            key={`${media.id}${i}`}
          >
            <div className={cn('relative w-full', isLogoWall ? 'h-12' : 'h-full')}>
              {isLogoWall ? (
                <MediaComponent
                  resource={media}
                  className="w-full h-full object-contain"
                  imgClassName="object-contain"
                />
              ) : (
                <GridTileImage
                  label={{
                    amount: 0,
                    title: media.alt || media.filename || '',
                  }}
                  media={media}
                />
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  )
}
