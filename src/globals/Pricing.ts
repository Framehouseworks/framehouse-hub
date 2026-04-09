import type { GlobalConfig } from 'payload'

/**
 * Pricing Global
 * 
 * Defines the schema for tiered pricing plans and the detailed feature inventory.
 * Follows Payload 3.0 best practices for enterprise-grade data management.
 */
export const Pricing: GlobalConfig = {
  slug: 'pricing',
  access: {
    read: () => true,
  },
  admin: {
    group: 'Product',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Plan Tiers',
          fields: [
            {
              name: 'plans',
              type: 'array',
              required: true,
              minRows: 1,
              maxRows: 3,
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'priceMonthly',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Include currency symbol (e.g., £0, £49)',
                  },
                },
                {
                  name: 'priceAnnual',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Include currency symbol (e.g., £0, £41)',
                  },
                },
                {
                  name: 'description',
                  type: 'textarea',
                  required: true,
                },
                {
                  name: 'ctaText',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'isRecommended',
                  type: 'checkbox',
                  defaultValue: false,
                },
                {
                  name: 'summaryFeatures',
                  type: 'array',
                  label: 'Summary Features (Landing Page Preview)',
                  fields: [
                    {
                      name: 'feature',
                      type: 'text',
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'The Inventory (Feature Matrix)',
          fields: [
            {
              name: 'featureCategories',
              type: 'array',
              fields: [
                {
                  name: 'name',
                  type: 'text',
                  required: true,
                  label: 'Category Name (e.g., STORAGE, ACCESS)',
                },
                {
                  name: 'features',
                  type: 'array',
                  fields: [
                    {
                      name: 'name',
                      type: 'text',
                      required: true,
                    },
                    {
                      name: 'description',
                      type: 'textarea',
                    },
                    {
                      type: 'row',
                      fields: [
                        {
                          name: 'plan1Value',
                          type: 'text',
                          label: 'Plan 1 Value',
                          admin: { width: '33%' },
                        },
                        {
                          name: 'plan2Value',
                          type: 'text',
                          label: 'Plan 2 Value',
                          admin: { width: '33%' },
                        },
                        {
                          name: 'plan3Value',
                          type: 'text',
                          label: 'Plan 3 Value',
                          admin: { width: '34%' },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Partners & Enterprise',
          fields: [
            {
              name: 'partnerLogos',
              type: 'array',
              label: 'In Production With (Partner Logos)',
              fields: [
                {
                  name: 'logo',
                  type: 'upload',
                  relationTo: 'media',
                  required: true,
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'enterpriseHeading',
                  type: 'text',
                  defaultValue: 'Looking for a custom solution?',
                  admin: { width: '50%' },
                },
                {
                  name: 'enterpriseCtaLabel',
                  type: 'text',
                  defaultValue: 'Contact Sales',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'enterpriseDescription',
              type: 'textarea',
              defaultValue: 'For high-volume production houses and enterprise teams requiring custom integrations, advanced security, and dedicated support.',
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'metaTitle',
              type: 'text',
              label: 'Meta Title',
              admin: {
                description: 'Custom title for SEO. Falls back to "Pricing | Framehouse Hub".',
              },
            },
            {
              name: 'metaDescription',
              type: 'textarea',
              label: 'Meta Description',
              admin: {
                description: 'Custom description for search results.',
              },
            },
            {
              name: 'metaImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Meta Image',
              admin: {
                description: 'Social sharing image (OpenGraph).',
              },
            },
          ],
        },
      ],
    },
  ],
}
