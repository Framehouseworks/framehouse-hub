import type { CollectionConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'
import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { adminOrSelf } from '@/access/adminOrSelf'
import { publicAccess } from '@/access/publicAccess'
import { checkRole } from '@/access/utilities'
import { protectRoles } from '@/collections/Users/hooks/protectRoles'

import { ensureFirstUserIsAdmin } from './hooks/ensureFirstUserIsAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: ({ req: { user } }) => checkRole(['admin'], user),
    create: publicAccess,
    delete: adminOnly,
    read: adminOrSelf,
    update: adminOrSelf,
  },
  admin: {
    group: 'Users',
    defaultColumns: ['name', 'email', 'roles'],
    useAsTitle: 'name',
    components: {
      views: {
        edit: {
          oversight: {
            Component:
              '@/collections/Users/components/CreativeOversightView#CreativeOversightView',
            path: '/oversight',
            tab: {
              label: 'Oversight',
              href: '/oversight',
            },
          },
        },
      },
    },
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'studioName',
      type: 'text',
      admin: {
        description: 'Studio or agency display name',
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      admin: {
        description: 'Short professional bio (max 300 characters)',
      },
    },
    {
      name: 'studioLogo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Studio logo shown in profile and portfolio header',
      },
    },
    {
      name: 'portfolioDefaults',
      type: 'group',
      admin: {
        description: 'Default settings applied to newly created portfolios only',
      },
      fields: [
        {
          name: 'defaultTheme',
          type: 'select',
          defaultValue: 'light',
          options: [
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ],
        },
        {
          name: 'defaultVisibility',
          type: 'select',
          defaultValue: 'private',
          options: [
            { label: 'Private', value: 'private' },
            { label: 'Password Protected', value: 'password' },
            { label: 'Public', value: 'public' },
          ],
        },
        {
          name: 'showWatermark',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'roles',
      type: 'select',
      access: {
        create: adminOnlyFieldAccess,
        read: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      defaultValue: ['viewer'],
      hasMany: true,
      hooks: {
        beforeChange: [ensureFirstUserIsAdmin, protectRoles],
      },
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Creative',
          value: 'creative',
        },
        {
          label: 'Viewer',
          value: 'viewer',
        },
      ],
    },
  ],
}
