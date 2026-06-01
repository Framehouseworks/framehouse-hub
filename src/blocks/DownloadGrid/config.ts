import type { Block } from 'payload'

export const DownloadGrid: Block = {
  slug: 'downloadGrid',
  interfaceName: 'DownloadGridBlock',
  labels: {
    singular: 'Download Grid',
    plural: 'Download Grids',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Free Downloads',
    },
    {
      name: 'subheading',
      type: 'text',
      defaultValue: 'LUTs, templates, and presets — free for registered users.',
    },
    {
      name: 'downloads',
      type: 'relationship',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: 'downloads' as any,
      hasMany: true,
      admin: {
        description: 'Select downloads to feature.',
      },
    },
    {
      name: 'backgroundColor',
      type: 'select',
      defaultValue: 'surface_low',
      options: [
        { label: 'White', value: 'white' },
        { label: 'Surface Low', value: 'surface_low' },
      ],
    },
  ],
}
