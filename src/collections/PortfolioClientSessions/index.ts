import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'

export const PortfolioClientSessions: CollectionConfig = {
  slug: 'portfolio-client-sessions',
  admin: {
    useAsTitle: 'clientName',
    group: 'Portfolio Reviews',
    description: 'Anonymous client sessions for portfolio review portals.',
    defaultColumns: ['portfolio', 'clientName', 'isIdentified', 'createdAt', 'expiresAt'],
  },
  access: {
    create: () => true,
    read: adminOnly,
    update: adminOnly,
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
      name: 'sessionToken',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true, description: 'HMAC-signed session identifier stored in httpOnly cookie.' },
    },
    {
      name: 'clientName',
      type: 'text',
      admin: { description: 'Name provided by the client via the identification modal.' },
    },
    {
      name: 'clientEmail',
      type: 'email',
      admin: { description: 'Optional email provided by the client.' },
    },
    {
      name: 'ipAddress',
      type: 'text',
      admin: { readOnly: true, description: 'Masked IP (last 2 octets replaced). e.g. 192.168.x.x' },
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'isIdentified',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'True when the client has completed the identification modal.' },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
      admin: { readOnly: true, description: '7-day rolling TTL from last interaction.' },
    },
    {
      name: 'savedSelectionIds',
      type: 'array',
      admin: { description: 'Current in-progress asset selection for this session.' },
      fields: [
        {
          name: 'mediaId',
          type: 'number',
          required: true,
        },
        {
          name: 'instanceId',
          type: 'text',
          admin: { description: 'Portfolio grid item instanceId for disambiguation when same media appears multiple times.' },
        },
      ],
    },
  ],
  timestamps: true,
}
