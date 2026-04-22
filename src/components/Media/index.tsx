import React, { Fragment } from 'react'

import type { Props } from './types'

import { Image as MediaImage } from './Image'
import { Video } from './Video'

export const Media: React.FC<Props> = (props) => {
  const { className, htmlElement = 'div', resource } = props

  const isVideo = typeof resource === 'object' && resource?.mimeType?.includes('video')
  const Tag = (htmlElement as React.ElementType) || Fragment

  return (
    <Tag
      {...(htmlElement !== null
        ? {
            className,
          }
        : {})}
    >
      {isVideo ? <Video {...props} /> : <MediaImage {...props} />}
    </Tag>
  )
}
