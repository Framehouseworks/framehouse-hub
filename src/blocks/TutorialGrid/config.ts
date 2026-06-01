import type { Block } from 'payload'

export const TutorialGrid: Block = {
  slug: 'tutorialGrid',
  interfaceName: 'TutorialGridBlock',
  labels: {
    singular: 'Tutorial Grid',
    plural: 'Tutorial Grids',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Platform Tutorials',
    },
    {
      name: 'subheading',
      type: 'text',
      defaultValue: 'Step-by-step guides for getting the most out of Framehouse Hub.',
    },
    {
      name: 'tutorials',
      type: 'relationship',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: 'tutorials' as any,
      hasMany: true,
      admin: {
        description: 'Select tutorials to feature. Leave empty to show all published tutorials.',
      },
    },
    {
      name: 'backgroundColor',
      type: 'select',
      defaultValue: 'white',
      options: [
        { label: 'White', value: 'white' },
        { label: 'Surface Low', value: 'surface_low' },
      ],
    },
  ],
}
