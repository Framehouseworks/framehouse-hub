import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      admin: {
        components: {
          RowLabel: '@/components/RowLabels#NavItemRowLabel',
        },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'group',
              type: 'checkbox',
              admin: {
                description: 'Check to turn this link into a dropdown menu.',
                width: '30%',
              },
              defaultValue: false,
            },
            {
              name: 'menuTitle',
              type: 'text',
              admin: {
                condition: (_, siblingData) => siblingData?.group,
                width: '70%',
              },
              validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) => {
                if (siblingData?.group && !value) {
                  return 'Menu title is required for dropdowns.'
                }
                return true
              },
            },
          ],
        },
        link({
          appearances: false,
          overrides: {
            admin: {
              condition: (_: unknown, siblingData: Record<string, unknown>) => !siblingData?.group,
            },
          },
        }),
        {
          name: 'subItems',
          type: 'array',
          label: 'Dropdown Links',
          admin: {
            condition: (_: unknown, siblingData: Record<string, unknown>) => !!siblingData?.group,
          },
          fields: [
            link({
              appearances: false,
              overrides: {
                fields: [
                  {
                    name: 'description',
                    type: 'textarea',
                    admin: {
                      description: 'Briefly describe this link (shown in megamenu).',
                    },
                  },
                ],
              },
            }),
          ],
          maxRows: 6,
        },
      ],
      maxRows: 6,
    },
  ],
}
