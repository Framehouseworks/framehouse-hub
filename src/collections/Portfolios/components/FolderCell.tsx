'use client'
import { useConfig } from '@payloadcms/ui'
import Link from 'next/link'
import type { DefaultCellComponentProps } from 'payload'
import React, { useEffect, useRef, useState } from 'react'

export const FolderCell: React.FC<DefaultCellComponentProps> = (props) => {
    const { cellData, rowData } = props
    const { config } = useConfig()
    const {
        routes: { admin: adminRoute, api: apiRoute } = { admin: '/admin', api: '/api' }
    } = config as unknown as { routes: { admin: string, api: string } }

    // cellData might be the folder ID or a folder object
    // If used as a virtual field cell, we look at rowData.folder (the internal field)
    const folder = cellData || rowData?.folder
    const folderId = typeof folder === 'object' ? folder?.id : folder

    const [path, setPath] = useState<{ id: string, name: string }[]>([])
    const [loading, setLoading] = useState(!!folderId)
    const hasFetched = useRef(false)

    useEffect(() => {
        const fetchFolderHierarchy = async () => {
            if (!folderId || hasFetched.current) return

            try {
                setLoading(true)
                const folderSlug = (config as unknown as { folders?: { slug: string } }).folders?.slug || 'payload-folders'
                // Fetch with depth to get parents
                const response = await fetch(`${apiRoute}/${folderSlug}/${folderId}?depth=10`, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })

                if (response.ok) {
                    const data = await response.json()
                    const segments: { id: string, name: string }[] = []

                    let current = data
                    while (current) {
                        segments.unshift({ id: current.id, name: current.name || 'Untitled' })
                        current = current.folder && typeof current.folder === 'object' ? current.folder : null
                    }

                    setPath(segments)
                } else {
                    setPath([{ id: folderId, name: 'Library' }])
                }
            } catch (err) {
                console.error('Error fetching folder hierarchy:', err)
                setPath([{ id: folderId, name: 'Library' }])
            } finally {
                setLoading(false)
                hasFetched.current = true
            }
        }

        if (folderId) {
            void fetchFolderHierarchy()
        }
    }, [folderId, apiRoute, config])

    const collectionSlug = 'portfolios'
    const foldersSlug = (config as unknown as { folders?: { slug: string } }).folders?.slug || 'payload-folders'

    const [libraryId, setLibraryId] = useState<string | null>(null)

    useEffect(() => {
        const fetchLibraryId = async () => {
            // If we already have it from path, no need to fetch
            const fromPath = path.find(seg => seg.name === 'Portfolio Library')?.id
            if (fromPath) {
                setLibraryId(fromPath)
                return
            }

            try {
                const response = await fetch(`${apiRoute}/library-id`)
                if (response.ok) {
                    const { id } = await response.json()
                    setLibraryId(id)
                }
            } catch (err) {
                console.error('Error fetching Library ID:', err)
            }
        }

        void fetchLibraryId()
    }, [apiRoute, config, path])

    const getLibraryHref = (id: string | null) => {
        if (id) return `${adminRoute}/collections/${collectionSlug}/${foldersSlug}/${id}`
        return `${adminRoute}/collections/${collectionSlug}/${foldersSlug}`
    }

    const libraryHref = getLibraryHref(libraryId)

    // If no folder assigned, show "Library" linking to the resolved Library folder
    if (!folderId) {
        return (
            <div
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.stopPropagation()}
                style={{ display: 'inline-block' }}
            >
                <Link
                    href={getLibraryHref(libraryId)}
                    style={{
                        color: 'var(--theme-elevation-400)',
                        textDecoration: 'none',
                        fontSize: '13px',
                        transition: 'all 0.15s ease-in-out',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        display: 'inline-block'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--theme-elevation-600)'
                        e.currentTarget.style.textDecoration = 'underline'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--theme-elevation-400)'
                        e.currentTarget.style.textDecoration = 'none'
                    }}
                >
                    Library
                </Link>
            </div>
        )
    }

    if (loading) {
        return <span style={{ opacity: 0.5, fontSize: '12px', fontStyle: 'italic', paddingLeft: '4px' }}>Loading...</span>
    }

    // Filter out "Portfolio Library" from the path segments to make it feel like THE root
    const displayPath = path.filter(seg => seg.name !== 'Portfolio Library')

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.stopPropagation()}
            style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: '13px',
                flexWrap: 'nowrap',
                fontFamily: 'var(--font-body)',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}
        >
            {/* Link to the actual Library folder ID if we have it */}
            <Link
                href={libraryHref}
                style={{
                    color: 'var(--theme-elevation-600)',
                    textDecoration: 'none',
                    fontWeight: displayPath.length === 0 ? '600' : '400',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease-in-out',
                    borderRadius: '3px',
                    display: 'inline-block'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--theme-elevation-800)'
                    e.currentTarget.style.textDecoration = 'underline'
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--theme-elevation-600)'
                    e.currentTarget.style.textDecoration = 'none'
                }}
            >
                Library
            </Link>

            {displayPath.length > 0 && (
                <span style={{
                    margin: '0 4px',
                    color: 'var(--theme-elevation-400)',
                    userSelect: 'none',
                    fontSize: '11px',
                    fontWeight: '300'
                }}>/</span>
            )}

            {displayPath.map((segment, index) => {
                const isLast = index === displayPath.length - 1

                // Collection-specific explorer route
                const segmentHref = `${adminRoute}/collections/${collectionSlug}/${foldersSlug}/${segment.id}`

                return (
                    <React.Fragment key={segment.id}>
                        <Link
                            href={segmentHref}
                            style={{
                                color: isLast ? 'var(--theme-primary-500)' : 'var(--theme-elevation-600)',
                                textDecoration: 'none',
                                fontWeight: isLast ? '600' : '400',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease-in-out',
                                borderRadius: '3px',
                                display: 'inline-block'
                            }}
                            className="folder-path-segment"
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = isLast ? 'var(--theme-primary-600)' : 'var(--theme-elevation-800)'
                                e.currentTarget.style.textDecoration = 'underline'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = isLast ? 'var(--theme-primary-500)' : 'var(--theme-elevation-600)'
                                e.currentTarget.style.textDecoration = 'none'
                            }}
                        >
                            {segment.name}
                        </Link>
                        {!isLast && (
                            <span style={{
                                margin: '0 4px',
                                color: 'var(--theme-elevation-400)',
                                userSelect: 'none',
                                fontSize: '11px',
                                fontWeight: '300'
                            }}>/</span>
                        )}
                    </React.Fragment>
                )
            })}
        </div>
    )
}
