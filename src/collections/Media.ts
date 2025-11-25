import { creativeOrAdmin } from '@/access/creativeOrAdmin'
import { publicAccess } from '@/access/publicAccess'
import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  admin: {
    group: 'Content',
  },
  slug: 'media',
  access: {
    // Everyone (including unauthenticated visitors) can READ media metadata & public preview URLs
    // This matches your "public portfolios" requirement
    read: publicAccess,

    // Only creatives and admins can create/upload/update/delete assets
    create: creativeOrAdmin,
    update: creativeOrAdmin,
    delete: creativeOrAdmin,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    staticDir: path.resolve(dirname, '../../public/media'),
  },
}
