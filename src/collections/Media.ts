import { creativeOrAdmin } from '@/access/creativeOrAdmin'
import { ownerOrAdmin } from '@/access/ownerOrAdmin'
import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import type { CollectionConfig } from 'payload'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'mediaType', 'owner', 'createdAt'],
  },
  access: {
    read: () => true, // Allow layout and gallery to see media metadata/files
    create: creativeOrAdmin,
    update: ownerOrAdmin,
    delete: ownerOrAdmin,
  },
  upload: {
    // TEMP DEV: store originals in public/media for now (dev only).
    // Production: replace with S3/GCS adapter in payload.config.ts plugins.
    staticDir: path.resolve(dirname, '../../public/media'),
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
    // ---- DAM-specific fields (MVP) ---- //
    {
      name: 'originalUrl',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'proxyUrl',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'thumbnailUrl',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'mediaType',
      type: 'select',
      options: [
        { label: 'Image', value: 'image' },
        { label: 'Video', value: 'video' },
      ],
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'filesize',
      type: 'number',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'width',
      type: 'number',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'height',
      type: 'number',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'aspectRatio',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Computed as width / height (e.g. 16:9).'
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Uploaded', value: 'uploaded' },
        { label: 'Processing', value: 'processing' },
        { label: 'Ready', value: 'ready' },
        { label: 'Error', value: 'error' },
      ],
      defaultValue: 'uploaded',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'errorMessage',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'processedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'collections',
      type: 'relationship',
      relationTo: 'portfolios',
      hasMany: true,
    },
    {
      name: 'tags',
      type: 'array',
      labels: {
        singular: 'Tag',
        plural: 'Tags',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
    {
      name: 'labels',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Client Approved', value: 'client-approved' },
        { label: 'Portfolio', value: 'portfolio' },
        { label: 'Work In Progress', value: 'wip' },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'favourite',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Small integer rating/stars. 0 = none.',
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hooks: {
        beforeValidate: [
          ({ req, value }) => {
            if (req.user && !value) {
              return req.user.id
            }
            return value
          },
        ],
      },
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    // keep legacy upload reference fields (Payload itself may populate these)
    {
      name: 'filename',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'mimeType',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    }
  ],
}
