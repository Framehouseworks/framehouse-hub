'use client'

import { useField } from '@payloadcms/ui'
import React from 'react'

export const MediaRowLabel: React.FC<any> = (props) => {
    const { path, index } = props
    // path is e.g. layoutBlocks.0.items.0
    // We need to look at the 'media' field under this row
    const { value: mediaId } = useField<any>({ path: `${path}.media` })
    const { value: size } = useField<string>({ path: `${path}.size` })

    const [media, setMedia] = React.useState<any>(null)

    React.useEffect(() => {
        const fetchMedia = async () => {
            if (!mediaId) {
                setMedia(null)
                return
            }

            const id = typeof mediaId === 'object' && mediaId !== null ? (mediaId as any).id || (mediaId as any)._id : mediaId

            try {
                const response = await fetch(`/api/media/${id}`)
                if (response.ok) {
                    const json = await response.json()
                    setMedia(json)
                }
            } catch (error) {
                console.error('Error fetching media for RowLabel:', error)
            }
        }

        fetchMedia()
    }, [mediaId])

    if (!media) return <div style={{ color: '#999', fontSize: '11px', textTransform: 'uppercase' }}>Item {index + 1}: Empty</div>

    const thumbnail = media.sizes?.thumbnail?.url || media.url

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '20px' }}>
            <div
                style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: '#111',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    borderRadius: '1px',
                    flexShrink: 0,
                    border: '1px solid #333'
                }}
            >
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={media.filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <span style={{ fontSize: '7px', color: '#444' }}>IMG</span>
                )}
            </div>
            <span style={{
                fontWeight: '500',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '140px'
            }}>
                {media.filename}
            </span>
            {size && (
                <span style={{
                    fontSize: '9px',
                    opacity: 0.6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    backgroundColor: '#222',
                    padding: '1px 5px',
                    borderRadius: '2px',
                    border: '1px solid #333'
                }}>
                    {size}
                </span>
            )}
        </div>
    )
}
