import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { PRODUCT_PAGE_DEFAULTS, type ProductPageData } from '@/constants/productPageDefaults'

export async function getProductPageData(): Promise<ProductPageData> {
  const payload = await getPayload({ config: configPromise })

  try {
    const cms = await payload.findGlobal({ slug: 'product-page' })

    const str = (v: unknown, fallback: string): string =>
      typeof v === 'string' && v.trim() ? v : fallback

    const bool = (v: unknown, fallback: boolean): boolean =>
      typeof v === 'boolean' ? v : fallback

    const arr = <T>(v: T[] | null | undefined, fallback: T[]): T[] =>
      Array.isArray(v) && v.length > 0 ? v : fallback

    return {
      heroHeading: str(cms.heroHeading, PRODUCT_PAGE_DEFAULTS.heroHeading),
      heroSubheading: str(cms.heroSubheading, PRODUCT_PAGE_DEFAULTS.heroSubheading),
      heroPrimaryLabel: str(cms.heroPrimaryLabel, PRODUCT_PAGE_DEFAULTS.heroPrimaryLabel),
      heroSecondaryLabel: str(cms.heroSecondaryLabel, PRODUCT_PAGE_DEFAULTS.heroSecondaryLabel),
      overviewHeading: str(cms.overviewHeading, PRODUCT_PAGE_DEFAULTS.overviewHeading),
      overviewItems: arr(
        cms.overviewItems as ProductPageData['overviewItems'],
        PRODUCT_PAGE_DEFAULTS.overviewItems,
      ),
      storageHeading: str(cms.storageHeading, PRODUCT_PAGE_DEFAULTS.storageHeading),
      storageSubheading: str(cms.storageSubheading, PRODUCT_PAGE_DEFAULTS.storageSubheading),
      storageActiveLabel: str(cms.storageActiveLabel, PRODUCT_PAGE_DEFAULTS.storageActiveLabel),
      storageActiveDescription: str(
        cms.storageActiveDescription,
        PRODUCT_PAGE_DEFAULTS.storageActiveDescription,
      ),
      storageArchiveLabel: str(cms.storageArchiveLabel, PRODUCT_PAGE_DEFAULTS.storageArchiveLabel),
      storageArchiveDescription: str(
        cms.storageArchiveDescription,
        PRODUCT_PAGE_DEFAULTS.storageArchiveDescription,
      ),
      orgHeading: str(cms.orgHeading, PRODUCT_PAGE_DEFAULTS.orgHeading),
      orgSubheading: str(cms.orgSubheading, PRODUCT_PAGE_DEFAULTS.orgSubheading),
      orgFeatures: arr(
        cms.orgFeatures as ProductPageData['orgFeatures'],
        PRODUCT_PAGE_DEFAULTS.orgFeatures,
      ),
      portfolioHeading: str(cms.portfolioHeading, PRODUCT_PAGE_DEFAULTS.portfolioHeading),
      portfolioSubheading: str(cms.portfolioSubheading, PRODUCT_PAGE_DEFAULTS.portfolioSubheading),
      portfolioBody: str(cms.portfolioBody, PRODUCT_PAGE_DEFAULTS.portfolioBody),
      portfolioComingSoon: bool(cms.portfolioComingSoon, PRODUCT_PAGE_DEFAULTS.portfolioComingSoon),
      sharingHeading: str(cms.sharingHeading, PRODUCT_PAGE_DEFAULTS.sharingHeading),
      sharingSubheading: str(cms.sharingSubheading, PRODUCT_PAGE_DEFAULTS.sharingSubheading),
      sharingBody: str(cms.sharingBody, PRODUCT_PAGE_DEFAULTS.sharingBody),
      sharingComingSoon: bool(cms.sharingComingSoon, PRODUCT_PAGE_DEFAULTS.sharingComingSoon),
      workflowHeading: str(cms.workflowHeading, PRODUCT_PAGE_DEFAULTS.workflowHeading),
      workflowSteps: arr(
        cms.workflowSteps as ProductPageData['workflowSteps'],
        PRODUCT_PAGE_DEFAULTS.workflowSteps,
      ),
      metaTitle: str(cms.metaTitle, PRODUCT_PAGE_DEFAULTS.metaTitle),
      metaDescription: str(cms.metaDescription, PRODUCT_PAGE_DEFAULTS.metaDescription),
    }
  } catch {
    return PRODUCT_PAGE_DEFAULTS
  }
}
