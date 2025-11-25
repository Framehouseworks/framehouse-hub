// src/collections/Asset/index.ts
import { creativeOrAdmin } from '@/access/creativeOrAdmin'
import type { CollectionConfig } from 'payload'

export const Assets: CollectionConfig = {
  slug: 'assets',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'owner', 'visibility', 'createdAt'],
  },
  access: {
    create: creativeOrAdmin,
    update: creativeOrAdmin,
    delete: creativeOrAdmin,
    read: () => true, // collections metadata can be readable in admin/public as needed
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      admin: {
        description: 'Human readable key. e.g. my-shoot-2025',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'visibility',
      type: 'select',
      options: [
        { label: 'Private', value: 'private' },
        { label: 'Shared (link)', value: 'shared' },
        { label: 'Public', value: 'public' },
      ],
      defaultValue: 'private',
    },
    {
      name: 'coverMedia',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'items',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'shareInfo',
      type: 'group',
      fields: [
        {
          name: 'publicLinkId',
          type: 'text',
          admin: { readOnly: true },
        },
        {
          name: 'expiresAt',
          type: 'date',
        },
        {
          name: 'allowDownload',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'passwordHash',
          type: 'text',
          admin: { readOnly: true },
        },
        {
          name: 'views',
          type: 'number',
          defaultValue: 0,
          admin: { readOnly: true },
        },
      ],
    },
  ],
}

