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
      name: 'layoutBlocks',
      type: 'blocks',
      required: true,
      blocks: [
        {
          slug: 'grid',
          labels: {
            singular: 'Media Grid',
            plural: 'Media Grids',
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
              name: 'columns',
              type: 'number',
              defaultValue: 3,
              min: 1,
              max: 6,
              admin: {
                description: 'Preferred number of columns on desktop'
              }
            }
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
            }
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
            }
          ],
        },
      ],
    },
  ],
}
