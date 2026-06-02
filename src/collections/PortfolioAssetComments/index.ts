import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'
import { checkRole } from '@/access/utilities'

export const PortfolioAssetComments: CollectionConfig = {
  slug: 'portfolio-asset-comments',
  admin: {
    useAsTitle: 'body',
    group: 'Portfolio Reviews',
    description: 'Per-asset comments left by clients during portfolio review.',
    defaultColumns: ['portfolio', 'media', 'clientName', 'status', 'createdAt'],
  },
  access: {
    create: () => true,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (checkRole(['admin'], user)) return true
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
      name: 'media',
      type: 'relationship',
      relationTo: 'media',
      required: true,
      index: true,
    },
    {
      name: 'clientSession',
      type: 'relationship',
      relationTo: 'portfolio-client-sessions',
      index: true,
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
      name: 'body',
      type: 'textarea',
      required: true,
      maxLength: 2000,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'visible',
      index: true,
      options: [
        { label: 'Visible', value: 'visible' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    {
      name: 'resolvedAt',
      type: 'date',
    },
    {
      name: 'resolvedBy',
      type: 'relationship',
      relationTo: 'users',
    },
  ],
  timestamps: true,
}
