import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

import { adminOnly } from '@/access/adminOnly'
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus'

export const Downloads: CollectionConfig = {
  slug: 'downloads',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: adminOrPublishedStatus,
    update: adminOnly,
  },
  admin: {
    group: 'Content',
    defaultColumns: ['title', 'fileType', 'requiresAccount', '_status'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'fileType',
      type: 'select',
      required: true,
      defaultValue: 'lut',
      options: [
        { label: 'LUT (Color Grade)', value: 'lut' },
        { label: 'Template', value: 'template' },
        { label: 'Preset', value: 'preset' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'downloadFile',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Upload the downloadable file here.',
      },
    },
    {
      name: 'externalUrl',
      type: 'text',
      label: 'External Download URL',
      admin: {
        description: 'Optional. Use instead of uploading a file directly.',
      },
    },
    {
      name: 'requiresAccount',
      type: 'checkbox',
      defaultValue: true,
      label: 'Requires Account to Download',
      admin: {
        description: 'When enabled, users must be signed in to download this resource.',
        position: 'sidebar',
      },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
      admin: {
        initCollapsed: true,
      },
    },
  ],
  hooks: {
    afterChange: [
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate) revalidatePath('/learn')
        return doc
      },
    ],
  },
  versions: {
    drafts: { autosave: true },
    maxPerDoc: 10,
  },
}
