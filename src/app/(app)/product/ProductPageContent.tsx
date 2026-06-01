'use client'

import Image from 'next/image'
import React from 'react'

import HHDAM from '@/assets/hub/hh-dam-new-1.webp'
import { EnterpriseCTA } from '@/components/EnterpriseCTA'
import { ProductCapabilityGrid } from '@/components/ProductCapabilityGrid'
import { ProductComingSoonVisual } from '@/components/ProductComingSoonVisual'
import { ProductFeatureSection } from '@/components/ProductFeatureSection'
import { ProductPageHero } from '@/components/ProductPageHero'
import { ProductStorageVisual } from '@/components/ProductStorageVisual'
import { ProductWorkflow } from '@/components/ProductWorkflow'
import { SprocketDivider } from '@/components/SprocketDivider'
import type { ProductPageData } from '@/constants/productPageDefaults'

const OrgVisual = () => (
  <div className="relative w-full overflow-hidden rounded-[24px]">
    <Image
      src={HHDAM}
      alt="Framehouse Hub organisation interface"
      className="h-auto w-full rounded-[24px] object-cover shadow-[0_20px_40px_rgba(26,28,28,0.06)]"
    />
  </div>
)

export const ProductPageContent: React.FC<{ data: ProductPageData }> = ({ data }) => {
  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0b]">
      {/* 1 — Hero */}
      <ProductPageHero
        heading={data.heroHeading}
        subheading={data.heroSubheading}
        primaryLabel={data.heroPrimaryLabel}
        secondaryLabel={data.heroSecondaryLabel}
      />

      <SprocketDivider />

      {/* 2 — Capability overview */}
      <ProductCapabilityGrid heading={data.overviewHeading} items={data.overviewItems} />

      {/* 3 — Media storage */}
      <ProductFeatureSection
        sectionLabel="01 / Storage"
        heading={data.storageHeading}
        subheading={data.storageSubheading}
        bg="white"
        visual={
          <ProductStorageVisual
            activeLabel={data.storageActiveLabel}
            activeDescription={data.storageActiveDescription}
            archiveLabel={data.storageArchiveLabel}
            archiveDescription={data.storageArchiveDescription}
          />
        }
      />

      {/* 4 — Organisation */}
      <ProductFeatureSection
        sectionLabel="02 / Organisation"
        heading={data.orgHeading}
        subheading={data.orgSubheading}
        features={data.orgFeatures}
        imageLeft
        bg="surface"
        visual={<OrgVisual />}
      />

      {/* 5 — Portfolio engine (placeholder) */}
      <ProductFeatureSection
        sectionLabel="03 / Portfolios"
        heading={data.portfolioHeading}
        subheading={data.portfolioSubheading}
        body={data.portfolioBody}
        bg="white"
        comingSoon={data.portfolioComingSoon}
        visual={<ProductComingSoonVisual label="Portfolio engine in development" />}
      />

      {/* 6 — Sharing & delivery (placeholder) */}
      <ProductFeatureSection
        sectionLabel="04 / Sharing"
        heading={data.sharingHeading}
        subheading={data.sharingSubheading}
        body={data.sharingBody}
        imageLeft
        bg="surface"
        comingSoon={data.sharingComingSoon}
        visual={<ProductComingSoonVisual label="Client delivery in development" />}
      />

      {/* 7 — End-to-end workflow */}
      <ProductWorkflow heading={data.workflowHeading} steps={data.workflowSteps} />

      {/* 8 — Final CTA */}
      <EnterpriseCTA
        heading="Ready to bring order to your archive?"
        description="Start with a free account. No credit card required. Your media, your structure, your pace."
        ctaLabel="Get started free"
      />
    </main>
  )
}
