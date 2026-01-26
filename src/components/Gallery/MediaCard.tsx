import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { Media } from '@/payload-types'
import Image from 'next/image'
import React from 'react'

type Props = {
    media: Media
}

export const MediaCard: React.FC<Props> = ({ media }) => {
    const title = media.alt || media.filename || 'Untitled'

    return (
        <Card className="group relative overflow-hidden border-none bg-zinc-900/50 backdrop-blur-md transition-all hover:ring-2 hover:ring-primary/50">
            <div className="relative aspect-square">
                {media.url && (
                    <Image
                        src={`${process.env.NEXT_PUBLIC_SERVER_URL}${media.url}`}
                        alt={title}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                )}

                {/* Overlay info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <Badge variant="secondary" className="mb-2 bg-white/10 text-white backdrop-blur-sm border-white/20">
                        {media.mediaType || 'image'}
                    </Badge>
                    <h3 className="text-sm font-medium text-white truncate">{title}</h3>
                </div>
            </div>
        </Card>
    )
}
