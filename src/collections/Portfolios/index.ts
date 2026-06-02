import { adminOnlyFieldAccess } from '@/access/adminOnlyFieldAccess'
import { ownerOrAdmin } from '@/access/ownerOrAdmin'
import {
  AlignFeature,
  BoldFeature,
  FixedToolbarFeature,
  ItalicFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import type { CollectionConfig, Where } from 'payload'
// REMOVED: Direct component imports to prevent CSS loading errors in Node
// import { FolderCell } from './components/FolderCell'
// import { LibraryRedirector } from './components/LibraryRedirector'
import { auditAdminChanges } from './hooks/auditAdminChanges'
import { deduplicateSectionAnchors } from './hooks/deduplicateSectionAnchors'
import { ensureLibraryAssignment } from './hooks/ensureLibraryAssignment'
import { generateSectionAnchor } from './hooks/generateSectionAnchor'
import { generateSlug } from './hooks/generateSlug'
import { reorderItems } from './hooks/reorderItems'
import { stripDocumentId } from './hooks/stripDocumentId'
import { portfolioEndpoints } from './endpoints'

// Minimal Lexical for Titles/Subheadings
const minimalistLexical = lexicalEditor({
  features: () => [BoldFeature(), ItalicFeature(), AlignFeature(), FixedToolbarFeature()],
})

// Rich Lexical for Content Blocks
const richLexical = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.filter((f) => f.key !== 'table'),
    FixedToolbarFeature(),
  ],
})

export const Portfolios: CollectionConfig = {
  slug: 'portfolios',
  folders: true,
  versions: {
    drafts: {
      autosave: {
        interval: 3000,
      },
    },
    maxPerDoc: 10,
  },
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
  endpoints: portfolioEndpoints,
  hooks: {
    beforeChange: [
      reorderItems,
      stripDocumentId,
      generateSlug,
      ensureLibraryAssignment,
      deduplicateSectionAnchors,
    ],
    afterChange: [auditAdminChanges],
  },
  access: {
    create: () => true,
    read: ({ req: { user } }) => {
      if (user?.roles?.includes('admin')) return true

      // Published public/shared portfolios are world-readable.
      // _status is a Payload versions field — cast needed because it's not
      // in the generated Where type but is available at query runtime.
      const publishedPublicQuery: Where = {
        and: [
          { visibility: { in: ['public', 'shared'] } } as Where,
          { _status: { equals: 'published' } } as unknown as Where,
        ],
      }

      if (!user) return publishedPublicQuery

      // Authenticated users also see their own portfolios (draft + published)
      return {
        or: [
          publishedPublicQuery,
          { owner: { equals: user.id } } as Where,
        ],
      } as Where
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
      },
    },
    {
      name: 'password',
      type: 'text',
      admin: {
        condition: (_, { visibility }) => visibility === 'shared',
        position: 'sidebar',
      },
    },
    {
      name: 'clientReviewSettings',
      type: 'group',
      label: 'Client Review',
      admin: {
        position: 'sidebar',
        description: 'Control what actions clients can take when viewing this portfolio.',
      },
      fields: [
        {
          name: 'allowSelection',
          type: 'checkbox',
          label: 'Allow Asset Selection',
          defaultValue: false,
          admin: { description: 'Clients can select assets and submit a shortlist.' },
        },
        {
          name: 'allowComments',
          type: 'checkbox',
          label: 'Allow Comments',
          defaultValue: false,
          admin: { description: 'Clients can leave notes on individual assets in the lightbox.' },
        },
        {
          name: 'allowDownload',
          type: 'checkbox',
          label: 'Allow Download',
          defaultValue: false,
          admin: { description: 'Clients can download their selected assets as a zip archive.' },
        },
        {
          name: 'requireClientIdentification',
          type: 'checkbox',
          label: 'Require Client Identification',
          defaultValue: false,
          admin: { description: 'Prompt clients for their name before they can submit a selection or comment.' },
        },
        {
          name: 'selectionLimit',
          type: 'number',
          label: 'Selection Limit',
          defaultValue: 0,
          min: 0,
          max: 200,
          admin: {
            description: 'Max assets a client can select. 0 = unlimited.',
            condition: (_, siblingData) => Boolean(siblingData?.allowSelection),
          },
        },
        {
          name: 'downloadQuality',
          type: 'select',
          label: 'Download Quality',
          defaultValue: 'proxy',
          dbName: 'p_crs_dl_quality',
          options: [
            { label: 'Preview Quality (Web-optimised WebP)', value: 'proxy' },
            { label: 'Full Resolution (Original file)', value: 'original' },
          ],
          admin: {
            description: 'Quality tier in the zip archive. Full Resolution blocked on public portfolios.',
            condition: (_, siblingData) => Boolean(siblingData?.allowDownload),
          },
        },
        {
          name: 'reviewMessage',
          type: 'text',
          label: 'Review Prompt',
          maxLength: 300,
          admin: {
            description: 'Optional message shown to clients above the gallery, e.g. "Please select your 5 favourite images."',
          },
        },
      ],
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
            singular: 'Grid Section',
            plural: 'Grid Sections',
          },
          fields: [
            // ── Section identity fields ────────────────────────────────────
            {
              name: 'sectionName',
              type: 'text',
              label: 'Section Name',
              admin: {
                description: 'Displayed as a header above this section on the public page.',
                placeholder: 'e.g. Campaign Video, Product Stills',
              },
            },
            {
              name: 'sectionAnchor',
              type: 'text',
              label: 'Section Anchor (auto-generated)',
              admin: {
                readOnly: true,
                description: 'URL anchor for deep linking — auto-generated from section name.',
              },
              hooks: {
                beforeChange: [generateSectionAnchor],
              },
              // Privacy note (Issue 9): collection-level access control restricts private
              // portfolios entirely — no field-level restriction needed here.
              // The DB-level unique index (migration 20260602_000002) prevents duplicate anchors
              // even if two concurrent saves race past the application-level deduplication hook.
            },
            {
              // Admin-only escape hatch for fixing corrupt anchors (C-1)
              name: 'sectionAnchorOverride',
              type: 'text',
              label: 'Anchor Override (admin only)',
              access: {
                read: adminOnlyFieldAccess,
                update: adminOnlyFieldAccess,
                create: adminOnlyFieldAccess,
              },
              admin: {
                description: 'If set, overrides the auto-generated anchor. Clear to revert to auto.',
                // Hidden from regular admin UI; the field hook reads it server-side
                condition: () => false,
              },
            },
            {
              name: 'showSectionHeader',
              type: 'checkbox',
              label: 'Show section name publicly',
              defaultValue: false,
              admin: {
                description: 'Display the section name as a heading on the public portfolio page.',
              },
            },
            {
              name: 'layoutStyle',
              type: 'select',
              label: 'Layout Style',
              defaultValue: 'masonry',
              required: true,
              options: [
                { label: 'Auto (Justified rows)', value: 'masonry' },
                { label: 'Filmstrip', value: 'filmstrip' },
                { label: 'Uniform Grid', value: 'uniform_grid' },
              ],
              admin: {
                description: 'Visual presentation style for this section. Filmstrip = horizontal scroll reel; Grid = fixed columns; Auto = justified rows.',
                components: {
                  Field: '@/collections/Portfolios/components/SectionLayoutAdminField#SectionLayoutAdminField',
                },
              },
            },
            {
              name: 'preserveAspectRatio',
              type: 'checkbox',
              label: 'Preserve original aspect ratios',
              defaultValue: false,
              admin: {
                description: 'Show images at their natural proportions — no cropping to row height. Only applies to Auto layout.',
                condition: (_, siblingData) => siblingData?.layoutStyle === 'masonry',
              },
            },
            {
              name: 'sectionWidth',
              type: 'select',
              label: 'Section width',
              defaultValue: 'full',
              options: [
                { label: 'Full width', value: 'full' },
                { label: 'Wide (1400px)', value: 'wide' },
                { label: 'Contained (1100px)', value: 'contained' },
                { label: 'Narrow (800px)', value: 'narrow' },
              ],
              admin: {
                description: 'Constrain the maximum width of this section. Useful for preventing very large images on wide monitors.',
              },
            },
            {
              // Backing field for filmstrip track height — controlled visually via SectionLayoutAdminField
              name: 'filmstripTrackHeight',
              type: 'select',
              label: 'Filmstrip Track Height',
              defaultValue: 'comfortable',
              options: [
                { label: 'Compact (280px)', value: 'compact' },
                { label: 'Comfortable (400px)', value: 'comfortable' },
                { label: 'Editorial (560px)', value: 'editorial' },
              ],
              admin: {
                // Hidden from the raw admin UI — managed inline by SectionLayoutAdminField above
                condition: () => false,
              },
            },
            {
              // Backing field for column count — controlled visually via SectionLayoutAdminField
              name: 'uniformGridColumns',
              type: 'select',
              label: 'Columns',
              defaultValue: '3',
              options: [
                { label: '2 Columns', value: '2' },
                { label: '3 Columns', value: '3' },
                { label: '4 Columns', value: '4' },
              ],
              admin: {
                // Hidden from the raw admin UI — managed inline by SectionLayoutAdminField above
                condition: () => false,
              },
            },
            // ── Grid items ────────────────────────────────────────────────
            // Standard Array Field (Placeholder for now)
            {
              name: 'items',
              type: 'array',
              required: true,
              admin: {
                initCollapsed: true,
                description: 'Add and reorder images for the grid.',
                components: {
                  Field:
                    '@/collections/Portfolios/components/MasonryGridV2/ModernMasonryEditor#ModernMasonryEditor',
                },
              },
              fields: [
                {
                  name: 'media',
                  type: 'relationship',
                  relationTo: 'media',
                  // Nullable so the FK can ON DELETE SET NULL without
                  // violating NOT NULL. See migration
                  // 20260520_180000_fix_portfolio_media_cascade.
                  required: false,
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
                {
                  name: 'instanceId',
                  type: 'text',
                  admin: {
                    // Force field to be present in API but hidden from UI
                    style: { display: 'none' },
                    readOnly: true,
                  },
                },
                {
                  name: 'instanceTitle',
                  type: 'text',
                  label: 'Display Name',
                  admin: {
                    description:
                      'Client-facing name for this asset in this portfolio only. Blank = uses original media title.',
                  },
                },
                {
                  name: 'focalPoint',
                  type: 'group',
                  label: 'Focal Point',
                  admin: {
                    description:
                      'X/Y percentage from top-left. 50/50 = center. Set visually in the dashboard editor; values here are for admin reference only.',
                  },
                  fields: [
                    {
                      name: 'x',
                      type: 'number',
                      min: 0,
                      max: 100,
                      defaultValue: 50,
                      admin: { description: '0 = left edge, 100 = right edge' },
                    },
                    {
                      name: 'y',
                      type: 'number',
                      min: 0,
                      max: 100,
                      defaultValue: 50,
                      admin: { description: '0 = top edge, 100 = bottom edge' },
                    },
                  ],
                },
                {
                  name: 'videoThumbnail',
                  type: 'group',
                  label: 'Video Thumbnail Override',
                  admin: {
                    description:
                      "Custom cover image for this video in this portfolio only. Does not affect the master media archive.",
                  },
                  fields: [
                    {
                      name: 'mode',
                      type: 'select',
                      defaultValue: 'auto',
                      options: [
                        { label: 'Auto (worker-generated)', value: 'auto' },
                        { label: 'Timecode frame', value: 'timecode' },
                        { label: 'Custom upload', value: 'custom' },
                      ],
                    },
                    {
                      name: 'timecodeSeconds',
                      type: 'number',
                      min: 0,
                      label: 'Timecode (seconds)',
                      admin: {
                        condition: (_, siblingData) => siblingData?.mode === 'timecode',
                        description: 'Seconds from start to use as poster frame',
                      },
                    },
                    {
                      name: 'customMedia',
                      type: 'relationship',
                      relationTo: 'media',
                      label: 'Custom Cover Image',
                      admin: {
                        condition: (_, siblingData) => siblingData?.mode === 'custom',
                        description:
                          'Upload ID for the custom video cover image for this asset in this portfolio.',
                      },
                    },
                  ],
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
            {
              name: 'itemsOrder',
              type: 'text',
              admin: {
                // Force field to be present in API but hidden from UI
                style: { display: 'none' },
                readOnly: true,
              },
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
              // Nullable so the FK can ON DELETE SET NULL without
              // violating NOT NULL. See migration
              // 20260520_180000_fix_portfolio_media_cascade.
              required: false,
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
