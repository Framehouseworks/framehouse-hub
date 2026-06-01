import type { Block } from 'payload'

export const ArticleGrid: Block = {
  slug: 'articleGrid',
  interfaceName: 'ArticleGridBlock',
  labels: {
    singular: 'Article Grid',
    plural: 'Article Grids',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'Articles & Guides',
    },
    {
      name: 'subheading',
      type: 'text',
      defaultValue: 'Insights and workflows from the Framehouse team.',
    },
    {
      name: 'articles',
      type: 'relationship',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      relationTo: 'articles' as any,
      hasMany: true,
      admin: {
        description: 'Select articles to feature. Leave empty to show latest published articles.',
      },
    },
    {
      name: 'viewAllLabel',
      type: 'text',
      defaultValue: 'View all articles',
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
