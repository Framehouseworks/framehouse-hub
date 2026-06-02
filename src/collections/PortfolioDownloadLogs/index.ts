import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'

export const PortfolioDownloadLogs: CollectionConfig = {
  slug: 'portfolio-download-logs',
  admin: {
    useAsTitle: 'zipFilename',
    group: 'Portfolio Reviews',
    description: 'Immutable audit log of every zip download event.',
    defaultColumns: ['portfolio', 'clientName', 'itemCount', 'quality', 'downloadedAt'],
  },
  access: {
    create: () => true,
    read: adminOnly,
    update: () => false,
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
    },
    {
      name: 'clientName',
      type: 'text',
    },
    {
      name: 'downloadedItems',
      type: 'array',
      fields: [
        {
          name: 'media',
          type: 'relationship',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'itemCount',
      type: 'number',
    },
    {
      name: 'quality',
      type: 'select',
      options: [
        { label: 'Preview Quality (proxy)', value: 'proxy' },
        { label: 'Full Resolution (original)', value: 'original' },
      ],
    },
    {
      name: 'zipFilename',
      type: 'text',
    },
    {
      name: 'downloadedAt',
      type: 'date',
      required: true,
      index: true,
    },
    {
      name: 'ipAddress',
      type: 'text',
    },
  ],
  timestamps: true,
}
