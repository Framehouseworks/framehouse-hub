import type { GlobalConfig } from 'payload'

import { adminOnly } from '@/access/adminOnly'

export const ProductPage: GlobalConfig = {
  slug: 'product-page',
  access: {
    read: () => true,
    update: adminOnly,
  },
  admin: {
    group: 'Product',
    description: 'Controls all editable copy on the /product marketing page.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Hero',
          fields: [
            {
              name: 'heroHeading',
              type: 'text',
              defaultValue: 'Every frame, exactly where it belongs.',
              admin: { description: 'Main headline. Keep it under 8 words for visual balance.' },
            },
            {
              name: 'heroSubheading',
              type: 'textarea',
              defaultValue:
                "Framehouse Hub gives independent creatives a structured home for their media — from the moment it's captured to the day it's shared.",
              admin: { description: 'One or two supporting sentences.' },
            },
            {
              name: 'heroPrimaryLabel',
              type: 'text',
              defaultValue: 'Start for free',
            },
            {
              name: 'heroSecondaryLabel',
              type: 'text',
              defaultValue: 'See pricing',
            },
          ],
        },
        {
          label: 'Overview',
          fields: [
            {
              name: 'overviewHeading',
              type: 'text',
              defaultValue: 'One platform. The full picture.',
            },
            {
              name: 'overviewItems',
              type: 'array',
              minRows: 3,
              maxRows: 4,
              admin: { description: 'High-level capability cards shown below the hero.' },
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'description', type: 'textarea', required: true },
                {
                  name: 'icon',
                  type: 'select',
                  defaultValue: 'upload',
                  options: [
                    { label: 'Upload Cloud', value: 'upload' },
                    { label: 'Folder', value: 'folder' },
                    { label: 'Grid', value: 'grid' },
                    { label: 'Share', value: 'share' },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Storage',
          fields: [
            {
              name: 'storageHeading',
              type: 'text',
              defaultValue: 'A home for your originals.',
            },
            {
              name: 'storageSubheading',
              type: 'textarea',
              defaultValue:
                "Upload once. Access always. Every original is preserved in full resolution, automatically organised by date, type, and shoot — exactly where you'd expect.",
            },
            { name: 'storageActiveLabel', type: 'text', defaultValue: 'Active Library' },
            {
              name: 'storageActiveDescription',
              type: 'textarea',
              defaultValue:
                'Frequently accessed work lives here — fast retrieval, rich metadata, always a search away.',
            },
            { name: 'storageArchiveLabel', type: 'text', defaultValue: 'Cold Archive' },
            {
              name: 'storageArchiveDescription',
              type: 'textarea',
              defaultValue:
                'Long-term storage for completed projects. Preserved with integrity, recalled when needed.',
            },
          ],
        },
        {
          label: 'Organisation',
          fields: [
            {
              name: 'orgHeading',
              type: 'text',
              defaultValue: 'Structure that works like you do.',
            },
            {
              name: 'orgSubheading',
              type: 'textarea',
              defaultValue:
                'Your library, your logic. Group work into Sessions, slice across it with Smart Collections, and tag freely — everything surfaces exactly when you need it.',
            },
            {
              name: 'orgFeatures',
              type: 'array',
              minRows: 3,
              maxRows: 6,
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'description', type: 'textarea', required: true },
              ],
            },
          ],
        },
        {
          label: 'Portfolios',
          fields: [
            {
              name: 'portfolioHeading',
              type: 'text',
              defaultValue: 'Your work, gallery-ready.',
            },
            {
              name: 'portfolioSubheading',
              type: 'textarea',
              defaultValue:
                'Turn any collection into a polished, public-facing portfolio — no design skills required. Choose a layout, publish a link.',
            },
            {
              name: 'portfolioBody',
              type: 'textarea',
              defaultValue:
                'Portfolios pull directly from your library. As your work evolves, they stay current. One source. Infinite presentation.',
            },
            {
              name: 'portfolioComingSoon',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description: 'Shows a "Coming Soon" treatment on this section. Uncheck when the feature ships.',
              },
            },
          ],
        },
        {
          label: 'Sharing',
          fields: [
            {
              name: 'sharingHeading',
              type: 'text',
              defaultValue: 'Delivery, without the back-and-forth.',
            },
            {
              name: 'sharingSubheading',
              type: 'textarea',
              defaultValue:
                'Send clients exactly what they need — nothing more. Password-protected links, expiry dates, and download controls give you confidence at every handoff.',
            },
            {
              name: 'sharingBody',
              type: 'textarea',
              defaultValue:
                'Built for the creative relationship: present your work, gather feedback, and close the loop without chasing emails.',
            },
            {
              name: 'sharingComingSoon',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description: 'Shows a "Coming Soon" treatment on this section. Uncheck when the feature ships.',
              },
            },
          ],
        },
        {
          label: 'Workflow',
          fields: [
            {
              name: 'workflowHeading',
              type: 'text',
              defaultValue: 'The full creative lifecycle, connected.',
            },
            {
              name: 'workflowSteps',
              type: 'array',
              minRows: 4,
              maxRows: 4,
              admin: { description: 'Exactly 4 workflow steps.' },
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'description', type: 'textarea', required: true },
              ],
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'metaTitle',
              type: 'text',
              defaultValue: 'Product | Framehouse Hub',
            },
            {
              name: 'metaDescription',
              type: 'textarea',
              defaultValue:
                'Discover how Framehouse Hub organises, archives, and shares your creative media — from upload to delivery.',
            },
          ],
        },
      ],
    },
  ],
}
