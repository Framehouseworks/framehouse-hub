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

  const title = ('meta' in doc && doc.meta?.title) || ('title' in doc && doc.title) || ('filename' in doc && doc.filename) || 'Framehouse Hub'
  const description = ('meta' in doc && doc.meta?.description) || ''

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
      url: 'slug' in doc && Array.isArray(doc.slug) ? doc.slug.join('/') : '/',
    }),
    title,
  }
}
