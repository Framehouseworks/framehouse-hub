import { ownerOrAdmin } from '@/access/ownerOrAdmin'
import {
  AlignFeature,
  BoldFeature,
  FixedToolbarFeature,
  ItalicFeature,
  lexicalEditor
} from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'
// REMOVED: Direct component imports to prevent CSS loading errors in Node
// import { FolderCell } from './components/FolderCell'
// import { LibraryRedirector } from './components/LibraryRedirector'
import { ensureLibraryAssignment } from './hooks/ensureLibraryAssignment'
import { generateSlug } from './hooks/generateSlug'
import { stripDocumentId } from './hooks/stripDocumentId'

// Minimal Lexical for Titles/Subheadings
const minimalistLexical = lexicalEditor({
  features: () => [
    BoldFeature(),
    ItalicFeature(),
    AlignFeature(),
    FixedToolbarFeature(), 
  ],
})

// Rich Lexical for Content Blocks
const richLexical = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.filter(f => f.key !== 'table'), 
    FixedToolbarFeature(),
  ],
})

export const Portfolios: CollectionConfig = {
  slug: 'portfolios',
  folders: true,
  admin: {
    group: 'Content',
    useAsTitle: 'name',
    defaultColumns: ['name', 'folderLocation', 'owner', 'visibility', 'updatedAt'],
    components: {
      // FIX: Use string path
      beforeListTable: ['@/collections/Portfolios/components/LibraryRedirector#LibraryRedirector'],
    },
    livePreview: {
      url: ({ data }) => `${process.env.NEXT_PUBLIC_SERVER_URL}/p/${data.slug}`,
    },
  },
  hooks: {
    beforeChange: [stripDocumentId, generateSlug, ensureLibraryAssignment],
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
      name: 'folderLocation',
      type: 'ui',
      admin: {
        components: {
          // FIX: Use string path
          Cell: '@/collections/Portfolios/components/FolderCell#FolderCell',
        },
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'title',
      type: 'richText',
      required: true,
      editor: minimalistLexical,
      admin: {
        description: 'Portfolio Title (Rich Text supported for custom emphasis)',
      },
    },
    {
      name: 'subheading',
      type: 'richText',
      editor: minimalistLexical,
      admin: {
        description: 'Portfolio Subheading (Rich Text supported)',
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Automatically generated based on username and title.',
      },
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
            // Standard Array Field (Placeholder for now)
            {
              name: 'items',
              type: 'array',
              required: true,
              admin: {
                initCollapsed: true, 
                description: 'Add and reorder images for the grid.',
              },
              fields: [
                {
                  name: 'media',
                  type: 'relationship',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'size',
                  type: 'select',
                  defaultValue: 'medium',
                  options: [
                    { label: 'Small', value: 'small' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Large', value: 'large' },
                    { label: 'Full Width', value: 'full' },
                  ],
                },
                {
                  name: 'alt',
                  type: 'text',
                  admin: {
                    description: 'Override alt text for this specific gallery item',
                  },
                },
                {
                  name: 'caption',
                  type: 'text',
                  admin: {
                    description: 'Caption shown in the visual layout',
                  },
                },
                {
                  name: 'link',
                  type: 'text',
                  admin: {
                    placeholder: 'https://...',
                  },
                },
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
          slug: 'text',
          labels: {
            singular: 'Rich Text Block',
            plural: 'Rich Text Blocks',
          },
          fields: [
            {
              name: 'content',
              type: 'richText',
              required: true,
              editor: richLexical,
            },
            {
              name: 'alignment',
              type: 'select',
              defaultValue: 'left',
              options: [
                { label: 'Left', value: 'left' },
                { label: 'Center', value: 'center' },
                { label: 'Right', value: 'right' },
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
              type: 'richText',
              editor: minimalistLexical,
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