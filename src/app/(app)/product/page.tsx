import type { Metadata } from 'next'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getProductPageData } from '@/utilities/getProductPageData'
import { ProductPageContent } from './ProductPageContent'

export async function generateMetadata(): Promise<Metadata> {
  const data = await getProductPageData()

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    openGraph: mergeOpenGraph({
      title: data.metaTitle,
      description: data.metaDescription,
      url: '/product',
    }),
  }
}

export default async function ProductPage() {
  const data = await getProductPageData()
  return <ProductPageContent data={data} />
}
