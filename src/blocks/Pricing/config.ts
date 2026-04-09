import type { Block } from 'payload'
import { link } from '@/fields/link'

export const Pricing: Block = {
  slug: 'pricing',
  interfaceName: 'PricingBlock',
  fields: [
    {
      name: 'layoutType',
      type: 'select',
      defaultValue: 'cards',
      options: [
        { label: 'Standard Cards', value: 'cards' },
        { label: 'Asymmetric Gallery', value: 'asymmetric' },
      ],
    },
    {
      name: 'billing',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'showBillingToggle', type: 'checkbox', defaultValue: true, admin: { width: '50%' } },
            { name: 'monthlyLabel', type: 'text', defaultValue: 'Monthly', admin: { width: '25%' } },
            { name: 'yearlyLabel', type: 'text', defaultValue: 'Yearly', admin: { width: '25%' } },
          ],
        },
      ],
    },
    {
      name: 'intro',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', required: true },
        { name: 'subheading', type: 'textarea' },
        {
          type: 'row',
          fields: [
            { name: 'showStorageEthos', type: 'checkbox', defaultValue: true, admin: { width: '50%' } },
            { name: 'storageNotice', type: 'text', defaultValue: 'Sustainable by Design: We don’t charge for storage.', admin: { width: '50%' } },
          ],
        },
      ],
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'GBP',
      options: [
        { label: 'GBP (£)', value: 'GBP' },
        { label: 'USD ($)', value: 'USD' },
        { label: 'EUR (€)', value: 'EUR' },
      ],
    },
    {
      name: 'tiers',
      type: 'array',
      minRows: 1,
      maxRows: 4,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'title', type: 'text', required: true, admin: { width: '50%' } },
            { name: 'price', type: 'text', required: true, admin: { width: '50%' } },
          ],
        },
        { name: 'description', type: 'textarea' },
        {
          name: 'features',
          type: 'array',
          fields: [{ name: 'feature', type: 'text' }],
        },
        {
          type: 'row',
          fields: [
            { name: 'highlight', type: 'checkbox', admin: { width: '50%' } },
            {
              name: 'accent',
              type: 'select',
              defaultValue: 'primary',
              options: [
                { label: 'Gold (Primary)', value: 'primary' },
                { label: 'Blue (Secondary)', value: 'secondary' },
                { label: 'Red (Artsy)', value: 'tertiary' },
              ],
              admin: { width: '50%' },
            },
          ],
        },
        link({
          disableLabel: false,
          overrides: {
            name: 'cta',
            label: 'Call to Action',
          },
        }),
      ],
    },
  ],
}
