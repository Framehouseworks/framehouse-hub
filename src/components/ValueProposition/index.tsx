'use client'
import React from 'react'
import { Feature197, FeatureItem } from '@/components/ui/feature197'

import HHCMS from '@/assets/hub/hh-cms-new-1.webp'
import HHDAM from '@/assets/hub/hh-dam-new-1.webp'
import HHECOM from '@/assets/hub/hh-ecom-2-new-1.webp'

const FEATURES: FeatureItem[] = [
  {
    id: 1,
    title: "Source-of-truth storage",
    description: "A centralised library for your most important work.",
    image: HHCMS.src,
  },
  {
    id: 2,
    title: "Clarity, not clutter",
    description: "Organise your assets with structure that actually makes sense.",
    image: HHDAM.src,
  },
  {
    id: 3,
    title: "Made to be seen",
    description: "From archive to audience, in a single step. Create and share portfolio-ready pages in a few clicks.",
    image: HHECOM.src,
  },
]

export const ValueProposition = () => {
  return (
    <div className="bg-background">
      <Feature197 
        title="Meet the one home for your media"
        features={FEATURES}
        className="pt-16 pb-32"
      />
    </div>
  )
}
