import type { Metadata } from 'next'

import type { Media, Page } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'

export const generateMeta = async (args: { doc: Page | Media }): Promise<Metadata> => {
  const { doc } = args || {}

  let ogImage: string | undefined

  if (doc && 'url' in doc && doc.url) {
    // It's a Media object
    ogImage = `${process.env.NEXT_PUBLIC_SERVER_URL}${doc.url}`
  } else if (doc && 'meta' in doc && doc.meta?.image && typeof doc.meta.image === 'object' && 'url' in doc.meta.image) {
    // It's a Page object with meta image
    ogImage = `${process.env.NEXT_PUBLIC_SERVER_URL}${doc.meta.image.url}`
  }

  const title = (doc as any)?.meta?.title || (doc as any)?.title || (doc as any)?.filename || 'Framehouse Hub'
  const description = (doc as any)?.meta?.description || ''

  return {
    description,
    openGraph: mergeOpenGraph({
      description,
      images: ogImage
        ? [
          {
            url: ogImage,
          },
        ]
        : undefined,
      title,
      url: Array.isArray((doc as any)?.slug) ? (doc as any)?.slug.join('/') : '/',
    }),
    title,
  }
}
