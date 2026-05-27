import { creativeOrAdmin } from '@/access/creativeOrAdmin'
import { ownerOrAdmin } from '@/access/ownerOrAdmin'
import type { CollectionConfig } from 'payload'
import { normalizeSessionName } from './hooks/normalizeSessionName'

export const Sessions: CollectionConfig = {
  slug: 'sessions',
  admin: {
    group: 'Content',
    useAsTitle: 'name',
    defaultColumns: ['name', 'shootDate', 'owner', 'createdAt'],
  },
  access: {
    read: ownerOrAdmin,
    create: creativeOrAdmin,
    update: ownerOrAdmin,
    delete: ownerOrAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      index: true,
      hooks: {
        beforeValidate: [normalizeSessionName],
      },
      admin: {
        description: 'Creative session name (e.g. "Golden Hour Beach Portraits").',
      },
    },
    {
      name: 'shootDate',
      type: 'date',
      index: true,
      admin: {
        description: 'Primary shoot date.',
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional notes about the shoot: concept, conditions, client context.',
      },
    },
    {
      name: 'location',
      type: 'group',
      fields: [
        { name: 'address', type: 'text' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
      ],
    },
    {
      name: 'defaultTags',
      type: 'array',
      label: 'Default Tags',
      admin: {
        description: 'Tags pre-applied to all assets ingested under this session.',
      },
      fields: [{ name: 'tag', type: 'text' }],
    },
    {
      name: 'coverAsset',
      type: 'relationship',
      relationTo: 'media',
      required: false,
      admin: {
        description: 'Hero image shown on the Sessions grid.',
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
            if (req.user && !value) return req.user.id
            return value
          },
        ],
      },
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
}
