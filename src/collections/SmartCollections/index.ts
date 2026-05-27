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
    defaultColumns: ['name', 'owner', 'generatedFrom', 'isHidden', 'updatedAt'],
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
      index: true,
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
    // FRH-47: Smart Collections v2 fields
    {
      name: 'isSystemGenerated',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Auto-generated from asset metadata. Editing strips this flag.',
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'isHidden',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Hide from default grid (soft hide — never touches assets).',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Pin ranking — lower = earlier in grid.',
      },
    },
    {
      name: 'generatedFrom',
      type: 'select',
      defaultValue: 'manual',
      index: true,
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'AI Tags', value: 'ai_tags' },
        { label: 'Metadata', value: 'metadata' },
        { label: 'Tags', value: 'tags' },
        { label: 'Location', value: 'location' },
        { label: 'Media Type', value: 'media_type' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'coverAsset',
      type: 'relationship',
      relationTo: 'media',
      admin: {
        description: 'Explicit cover image override. Falls back to 4-asset mosaic.',
        position: 'sidebar',
      },
    },
    {
      name: 'manualIncludes',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Assets always included regardless of filterQuery. Cap: 500.',
      },
    },
    {
      name: 'manualExcludes',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description:
          'Assets always excluded regardless of filterQuery. Exclusions take priority over inclusions.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      // Strip isSystemGenerated when user edits a system-generated collection
      ({ data, originalDoc }) => {
        if (originalDoc?.isSystemGenerated && data) {
          const isEditingRules =
            data.filterQuery !== undefined &&
            JSON.stringify(data.filterQuery) !== JSON.stringify(originalDoc.filterQuery)
          if (isEditingRules) {
            data.isSystemGenerated = false
          }
        }
        return data
      },
    ],
  },
}
