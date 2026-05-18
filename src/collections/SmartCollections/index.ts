import type { CollectionConfig } from 'payload'
import { creativeOrAdmin } from '@/access/creativeOrAdmin'
import { ownerOrAdmin } from '@/access/ownerOrAdmin'

export const SmartCollections: CollectionConfig = {
  slug: 'smart-collections',
  access: {
    create: creativeOrAdmin,
    delete: ownerOrAdmin,
    read: ownerOrAdmin,
    update: ownerOrAdmin,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'owner', 'updatedAt'],
    group: 'Archival Governance',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'filterQuery',
      type: 'json',
      required: true,
      admin: {
        description: 'The Payload query object that defines this smart view.',
      },
    },
    {
      name: 'icon',
      type: 'select',
      defaultValue: 'folder',
      options: [
        { label: 'Folder', value: 'folder' },
        { label: 'Tag', value: 'tag' },
        { label: 'Sparkles', value: 'sparkles' },
        { label: 'Camera', value: 'camera' },
        { label: 'Map', value: 'map' },
      ],
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
}
