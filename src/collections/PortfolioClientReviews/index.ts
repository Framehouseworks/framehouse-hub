import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'
import { checkRole } from '@/access/utilities'

export const PortfolioClientReviews: CollectionConfig = {
  slug: 'portfolio-client-reviews',
  admin: {
    useAsTitle: 'clientName',
    group: 'Portfolio Reviews',
    description: 'Formal asset selections submitted by clients for creative review.',
    defaultColumns: ['portfolio', 'clientName', 'status', 'itemCount', 'submittedAt'],
  },
  access: {
    create: () => true,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (checkRole(['admin'], user)) return true
      // Creatives see only reviews on portfolios they own
      return {
        'portfolio.owner': { equals: user.id },
      }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (checkRole(['admin'], user)) return true
      return {
        'portfolio.owner': { equals: user.id },
      }
    },
    delete: adminOnly,
  },
  fields: [
    {
      name: 'portfolio',
      type: 'relationship',
      relationTo: 'portfolios',
      required: true,
      index: true,
    },
    {
      name: 'clientSession',
      type: 'relationship',
      relationTo: 'portfolio-client-sessions',
      index: true,
      admin: { description: 'The session that originated this review.' },
    },
    {
      name: 'clientName',
      type: 'text',
      required: true,
    },
    {
      name: 'clientEmail',
      type: 'email',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'submitted',
      index: true,
      options: [
        { label: 'Submitted', value: 'submitted' },
        { label: 'Acknowledged', value: 'acknowledged' },
        { label: 'Approved', value: 'approved' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'selectedItems',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'media',
          type: 'relationship',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'instanceId',
          type: 'text',
          admin: { description: 'Portfolio grid instanceId — disambiguates same media in multiple sections.' },
        },
        {
          name: 'instanceTitle',
          type: 'text',
          admin: { description: 'Denormalised title snapshot at time of submission.' },
        },
      ],
    },
    {
      name: 'itemCount',
      type: 'number',
      admin: {
        readOnly: true,
        description: 'Denormalised count of selectedItems for list views.',
      },
    },
    {
      name: 'clientNote',
      type: 'textarea',
      maxLength: 1000,
      admin: { description: 'Optional overall note from the client with their submission.' },
    },
    {
      name: 'submittedAt',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'acknowledgedAt',
      type: 'date',
    },
    {
      name: 'acknowledgedBy',
      type: 'relationship',
      relationTo: 'users',
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (Array.isArray(data.selectedItems)) {
          data.itemCount = data.selectedItems.length
        }
        return data
      },
    ],
  },
  timestamps: true,
}
