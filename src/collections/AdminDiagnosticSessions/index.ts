import type { CollectionConfig } from 'payload'
import { adminOnly } from '@/access/adminOnly'

export const AdminDiagnosticSessions: CollectionConfig = {
  slug: 'admin-diagnostic-sessions',
  admin: {
    group: 'Admin Oversight',
    useAsTitle: 'id',
    defaultColumns: ['admin', 'targetCreative', 'isActive', 'expiresAt', 'createdAt'],
    description: 'Short-lived diagnostic sessions allowing admins to view creative workspaces read-only.',
  },
  access: {
    create: adminOnly,
    read: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  timestamps: true,
  fields: [
    {
      name: 'admin',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'The admin who launched this session.',
      },
    },
    {
      name: 'targetCreative',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'The creative account being inspected.',
      },
    },
    {
      name: 'tokenHash',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'SHA-256 hash of the raw session token. Token is never stored in plaintext.',
        readOnly: true,
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'Session TTL — 15 minutes from creation.',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: {
        description: 'Set to false when session is terminated or expires.',
      },
    },
    {
      name: 'terminatedAt',
      type: 'date',
      admin: {
        description: 'When the session was manually terminated.',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'terminatedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Admin who explicitly terminated the session.',
      },
    },
    {
      name: 'ipAddress',
      type: 'text',
      admin: {
        description: 'IP address when session was created.',
      },
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: {
        description: 'Browser user agent when session was created.',
      },
    },
  ],
}
