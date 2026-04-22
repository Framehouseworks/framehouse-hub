'use client'
import { useConfig } from '@payloadcms/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Redirects the user from the "Technical Root" of the folder explorer
 * to the actual "Portfolio Library" folder where items are visible.
 */
export const LibraryRedirector: React.FC = () => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { config } = useConfig()
    const [isRedirecting, setIsRedirecting] = useState(false)

    useEffect(() => {
        const displayAs = searchParams.get('displayAs')
        const { routes: { admin: adminRoute, api: apiRoute } } = config as unknown as { routes: { admin: string, api: string } }
        const portfolioPath = `${adminRoute}/collections/portfolios`
        const foldersSlug = (config as unknown as { folders?: { slug: string } }).folders?.slug || 'payload-folders'
        const foldersPath = `${adminRoute}/collections/${foldersSlug}`

        // Trigger redirect if:
        // 1. Portfolios list view in folder mode (browseByFolder: true)
        // 2. Folders collection list view (absolute root)
        const isPortfolioRoot = pathname === portfolioPath && displayAs === 'folder'
        const isFoldersRoot = pathname === foldersPath

        if ((isPortfolioRoot || isFoldersRoot) && !isRedirecting) {
            const fetchLibraryId = async () => {
                setIsRedirecting(true)
                try {
                    const response = await fetch(`${apiRoute}/library-id`)
                    if (response.ok) {
                        const { id } = await response.json()
                        const targetUrl = `${adminRoute}/collections/portfolios/${foldersSlug}/${id}`
                        router.replace(targetUrl)
                    }
                } catch (err) {
                    console.error('Error redirecting to library:', err)
                    setIsRedirecting(false)
                }
            }
            void fetchLibraryId()
        }
    }, [searchParams, pathname, config, router, isRedirecting])

    if (isRedirecting) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', opacity: 0.7, fontSize: '14px' }}>
                Entering Library...
            </div>
        )
    }

    return null
}
