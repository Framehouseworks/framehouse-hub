import type { Block } from 'payload'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export const About3: Block = {
  slug: 'about3',
  interfaceName: 'About3Block',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: 'About Us',
    },
    {
      name: 'description',
      type: 'textarea',
      defaultValue: 'We are a passionate team dedicated to creating innovative solutions that empower businesses to thrive in the digital age.',
    },
    {
      name: 'mainImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'secondaryImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'breakout',
      type: 'group',
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'buttonText',
          type: 'text',
        },
        {
          name: 'buttonUrl',
          type: 'text',
        },
      ],
    },
    {
      name: 'companies',
      type: 'array',
      fields: [
        {
          name: 'logo',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
      admin: {
        initCollapsed: true,
      },
    },
    {
      name: 'achievementsTitle',
      type: 'text',
      defaultValue: 'Our Achievements in Numbers',
    },
    {
      name: 'achievementsDescription',
      type: 'textarea',
    },
    {
      name: 'achievements',
      type: 'array',
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'value',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'contentSections',
      type: 'array',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'content',
          type: 'textarea',
          required: true,
        },
        {
          name: 'media',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
  ],
}
