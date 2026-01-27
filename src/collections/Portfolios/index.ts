import { ownerOrAdmin } from '@/access/ownerOrAdmin'
import type { CollectionConfig } from 'payload'

export const Portfolios: CollectionConfig = {
  slug: 'portfolios',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'owner', 'visibility', 'updatedAt'],
  },
  access: {
    create: () => true,
    read: ({ req: { user } }) => {
      if (user?.roles?.includes('admin')) return true

      const publicQuery = {
        visibility: {
          in: ['public', 'shared'],
        },
      }

      if (!user) {
        return publicQuery
      }

      return {
        or: [
          publicQuery,
          {
            owner: {
              equals: user.id,
            },
          },
        ],
      }
    },
    update: ownerOrAdmin,
    delete: ownerOrAdmin,
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
      unique: true,
      admin: {
        description: 'URL path for the portfolio (e.g. wedding-day-2024)',
      },
    },
    {
      name: 'subheading',
      type: 'text',
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hooks: {
        beforeValidate: [
          ({ req, value }) => {
            if (req.user && !value) {
              return req.user.id
            }
            return value
          },
        ],
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'private',
      options: [
        { label: 'Private', value: 'private' },
        { label: 'Public (Link)', value: 'public' },
        { label: 'Password Protected', value: 'shared' },
      ],
      admin: {
        position: 'sidebar',
      }
    },
    {
      name: 'password',
      type: 'text',
      admin: {
        condition: (_, { visibility }) => visibility === 'shared',
        position: 'sidebar',
      }
    },
    {
      name: 'theme',
      type: 'group',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'fontPairing',
          type: 'select',
          defaultValue: 'modern-sans',
          options: [
            { label: 'Modern Sans (Inter)', value: 'modern-sans' },
            { label: 'Classic Serif (Playfair)', value: 'classic-serif' },
            { label: 'Technical Mono (IBM Plex)', value: 'tech-mono' },
          ],
        },
        {
          name: 'backgroundColor',
          type: 'text',
          defaultValue: '#000000',
          admin: {
            description: 'Hex color for the portfolio background',
          },
        },
        {
          name: 'textColor',
          type: 'text',
          defaultValue: '#ffffff',
          admin: {
            description: 'Hex color for the text',
          },
        },
        {
          name: 'accentColor',
          type: 'text',
          defaultValue: '#ffffff',
          admin: {
            description: 'Hex color for accents and dividers',
          },
        },
      ],
    },
    {
      name: 'layoutBlocks',
      type: 'blocks',
      required: true,
      blocks: [
        {
          slug: 'grid',
          labels: {
            singular: 'Masonry Grid',
            plural: 'Masonry Grids',
          },
          fields: [
            {
              name: 'items',
              type: 'relationship',
              relationTo: 'media',
              hasMany: true,
              required: true,
            },
            {
              name: 'sizeMode',
              type: 'select',
              defaultValue: 'medium',
              options: [
                { label: 'Small (Dense)', value: 'small' },
                { label: 'Medium (Balanced)', value: 'medium' },
                { label: 'Large (Airy)', value: 'large' },
              ],
            },
            {
              name: 'spacing',
              type: 'select',
              defaultValue: 'medium',
              options: [
                { label: 'Tight', value: 'small' },
                { label: 'Medium', value: 'medium' },
                { label: 'Large', value: 'large' },
                { label: 'None', value: 'none' },
              ],
            },
          ],
        },
        {
          slug: 'featured',
          labels: {
            singular: 'Featured Media',
            plural: 'Featured Media Items',
          },
          fields: [
            {
              name: 'media',
              type: 'relationship',
              relationTo: 'media',
              required: true,
            },
            {
              name: 'caption',
              type: 'text',
            },
            {
              name: 'parallaxEffect',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
        {
          slug: 'spacer',
          labels: {
            singular: 'Section Spacer',
            plural: 'Section Spacers',
          },
          fields: [
            {
              name: 'size',
              type: 'select',
              defaultValue: 'medium',
              options: [
                { label: 'Small', value: 'small' },
                { label: 'Medium', value: 'medium' },
                { label: 'Large', value: 'large' },
              ],
            },
            {
              name: 'showDivider',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
      ],
    },
  ],
}
