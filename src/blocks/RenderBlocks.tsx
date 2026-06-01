import { About3Block } from '@/blocks/About3/Component'
import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'
import { ArticleGridBlock } from '@/blocks/ArticleGrid/Component'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { CarouselBlock } from '@/blocks/Carousel/Component'
import { ContentBlock } from '@/blocks/Content/Component'
import { DownloadGridBlock } from '@/blocks/DownloadGrid/Component'
import { FormBlock } from '@/blocks/Form/Component'
import { MediaBlock } from '@/blocks/MediaBlock/Component'
import { PricingBlock } from '@/blocks/Pricing/Component'
import { SprocketDividerBlock } from '@/blocks/SprocketDivider/Component'
import { ThreeItemGridBlock } from '@/blocks/ThreeItemGrid/Component'
import { TutorialGridBlock } from '@/blocks/TutorialGrid/Component'
import { toKebabCase } from '@/utilities/toKebabCase'
import React, { Fragment } from 'react'

import type { Page } from '../payload-types'

const blockComponents = {
  about3: About3Block,
  archive: ArchiveBlock,
  articleGrid: ArticleGridBlock,
  banner: BannerBlock,
  carousel: CarouselBlock,
  content: ContentBlock,
  cta: CallToActionBlock,
  downloadGrid: DownloadGridBlock,
  formBlock: FormBlock,
  mediaBlock: MediaBlock,
  pricing: PricingBlock,
  sprocketDivider: SprocketDividerBlock,
  threeItemGrid: ThreeItemGridBlock,
  tutorialGrid: TutorialGridBlock,
}

export const RenderBlocks: React.FC<{
  blocks: Page['layout'][0][]
}> = (props) => {
  const { blocks } = props

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockName, blockType } = block

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType]

            if (Block) {
              return (
                <Fragment key={index}>
                  {/* @ts-expect-error - weird type mismatch here */}
                  <Block id={toKebabCase(blockName!)} {...block} />
                </Fragment>
              )
            }
          }
          return null
        })}
      </Fragment>
    )
  }

  return null
}
