import type { Block } from 'payload'

export const ThreeItemGrid: Block = {
  slug: 'threeItemGrid',
  fields: [
    {
      name: 'backgroundColor',
      type: 'select',
      defaultValue: 'white',
      options: [
        { label: 'White', value: 'white' },
        { label: 'Surface Low', value: 'surface_low' },
      ],
    },
    {
      name: 'style',
      type: 'select',
      defaultValue: 'default',
      options: [
        {
          label: 'Gallery Grid (Default)',
          value: 'default',
        },
        {
          label: 'Editorial Pillars',
          value: 'pillars',
        },
      ],
    },
    {
      name: 'media',
      type: 'relationship',
      admin: {
        condition: (_, siblingData) => siblingData.style === 'default',
        isSortable: true,
      },
      hasMany: true,
      label: 'Grid Media',
      maxRows: 3,
      minRows: 0,
      relationTo: 'media',
    },
    {
      name: 'items',
      type: 'array',
      admin: {
        components: {
          RowLabel: '@/components/RowLabels#PillarRowLabel',
        },
        condition: (_, siblingData) => siblingData.style === 'pillars',
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          admin: {
            placeholder: 'Item Title',
          },
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
          admin: {
            description: 'Provide an editorial takeaway for this pillar.',
            placeholder: 'Briefly describe this feature...',
          },
          required: true,
        },
        {
          name: 'media',
          type: 'relationship',
          relationTo: 'media',
          required: true,
        },
      ],
      maxRows: 3,
    },
  ],
  interfaceName: 'ThreeItemGridBlock',
  labels: {
    plural: 'Three Item Grids',
    singular: 'Three Item Grid',
  },
}
