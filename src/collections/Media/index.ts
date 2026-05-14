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
import { extractMetadata } from './hooks/extractMetadata'
import { preventDuplicates } from './hooks/preventDuplicates'
import { generateAccessionId } from './hooks/generateAccessionId'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  hooks: {
    beforeOperation: [preventDuplicates],
    beforeValidate: [],
    beforeChange: [generateAccessionId, extractMetadata],
  },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'filename', 'mediaType', 'owner', 'createdAt'],
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
    staticDir: path.resolve(dirname, '../../../public/media'),
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: undefined,
        position: 'centre',
      },
      {
        name: 'optimized',
        width: 1600,
        height: undefined,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
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
      name: 'accessionId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Permanent archival catalog code (e.g. FRH-2024-0001).',
      },
    },
    {
      name: 'archivalSequence',
      type: 'number',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Atomic intake counter (1, 2, 3...) for scalable provenance.',
      },
    },
    {
      name: 'shootName',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Archival Shoot Identity (e.g. Wildlife Expedition 2024).',
      },
    },
    {
      name: 'mediaType',
      type: 'select',
      options: [
        { label: 'Image', value: 'image' },
        { label: 'Raw', value: 'raw' },
      ],
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'ingestionStatus',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Processing', value: 'processing' },
        { label: 'Stale', value: 'stale' },
        { label: 'Ready', value: 'ready' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'active',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    // ---- Normalized Technical Metadata ---- //
    {
      name: 'captureDate',
      type: 'date',
      index: true,
      admin: {
        description: 'Primary sort key. Extracted from EXIF or file date.',
        position: 'sidebar',
      },
    },
    {
      name: 'technical',
      type: 'group',
      label: 'Technical Metadata',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'cameraModel',
          type: 'text',
        },
        {
          name: 'lensModel',
          type: 'text',
        },
        {
          name: 'iso',
          type: 'number',
        },
        {
          name: 'aperture',
          type: 'number',
        },
        {
          name: 'shutterSpeed',
          type: 'text',
        },
        {
          name: 'focalLength',
          type: 'number',
        },
      ],
    },
    {
      name: 'location',
      type: 'group',
      fields: [
        {
          name: 'latitude',
          type: 'number',
        },
        {
          name: 'longitude',
          type: 'number',
        },
        {
          name: 'address',
          type: 'text',
        },
      ],
    },
    // ---- Classification ---- //
    {
      name: 'manualTags',
      type: 'array',
      label: 'Archival Tags',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
    {
      name: 'heuristicTags',
      type: 'array',
      label: 'System Tags',
      admin: {
        readOnly: true,
        description: 'Rule-based tags generated during ingestion (e.g. filename parsing).',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
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
        description: 'Computed as width / height (e.g. 16:9).',
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
    // Legacy/System fields (Payload will populate these)
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
    },
  ],
}
