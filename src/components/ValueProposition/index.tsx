'use client'
import React from 'react'
import { Feature197, FeatureItem } from '@/components/ui/feature197'

import HHCMS from '@/assets/hub/hh-cms-new-1.webp'
import HHDAM from '@/assets/hub/hh-dam-new-1.webp'
import HHECOM from '@/assets/hub/hh-ecom-2-new-1.webp'

export type ValuePropositionProps = {
  title?: string
  features?: FeatureItem[]
}

export const DEFAULT_CONTENT: Required<ValuePropositionProps> = {
  title: "Meet the one home for your media",
  features: [
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
}

export const ValueProposition: React.FC<ValuePropositionProps> = (props) => {
  const { title = DEFAULT_CONTENT.title, features = DEFAULT_CONTENT.features } = props
  
  return (
    <div className="bg-background">
      <Feature197 
        title={title}
        features={features}
        className="pt-16 pb-32"
      />
    </div>
  )
}
