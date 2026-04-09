import type { Metadata } from 'next'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: 'Manage, organise, and share your assets in a single source of truth with Framehouse Hub.',
  images: [
    {
      url: '/assets/hub/hero_image.png',
    },
  ],
  siteName: 'Framehouse Hub',
  title: 'Framehouse Hub',
}

export const mergeOpenGraph = (og?: Partial<Metadata['openGraph']>): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
