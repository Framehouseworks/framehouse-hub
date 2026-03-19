import Image from 'next/image'
import React from 'react'
import type { Media } from '@/payload-types'

interface Props {
  media: Media
}

export const MediaCard: React.FC<Props> = ({ media }) => {
  const title = media.alt || media.filename || 'Untitled'
  const src = `${process.env.NEXT_PUBLIC_SERVER_URL}${media.url}`

  return (
    <div className="relative overflow-hidden">
      {media.url && (
        <Image
          src={src}
          alt={title}
          width={media.width || 0}
          height={media.height || 0}
          unoptimized
          className="object-contain transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      )}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-500 pointer-events-none" />
      {media.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-2 text-sm text-white">
          {media.caption}
        </div>
      )}
    </div>
  )
}
