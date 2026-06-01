import type { CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'

import { adminOnly } from '@/access/adminOnly'
import { adminOrPublishedStatus } from '@/access/adminOrPublishedStatus'
import { slugField } from '@/fields/slug'
import {
  BoldFeature,
  HeadingFeature,
  ItalicFeature,
  OrderedListFeature,
  UnorderedListFeature,
  lexicalEditor,
  FixedToolbarFeature,
  InlineToolbarFeature,
} from '@payloadcms/richtext-lexical'
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

export const Tutorials: CollectionConfig = {
  slug: 'tutorials',
  access: {
    create: adminOnly,
    delete: adminOnly,
    read: adminOrPublishedStatus,
    update: adminOnly,
  },
  admin: {
    group: 'Content',
    defaultColumns: ['title', 'category', 'difficulty', 'order', '_status'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Short summary shown on the learn page card.',
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      defaultValue: 'getting-started',
      options: [
        { label: 'Getting Started', value: 'getting-started' },
        { label: 'Organise', value: 'organise' },
        { label: 'Publish', value: 'publish' },
        { label: 'Advanced', value: 'advanced' },
      ],
    },
    {
      name: 'difficulty',
      type: 'select',
      defaultValue: 'beginner',
      options: [
        { label: 'Beginner', value: 'beginner' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Advanced', value: 'advanced' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'duration',
      type: 'text',
      label: 'Duration (e.g. "5 min")',
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'number',
      label: 'Display Order',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Lower numbers appear first.',
      },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'steps',
      type: 'array',
      label: 'Tutorial Steps',
      fields: [
        {
          name: 'stepTitle',
          type: 'text',
          required: true,
        },
        {
          name: 'stepContent',
          type: 'richText',
          editor: lexicalEditor({
            features: ({ rootFeatures }) => [
              ...rootFeatures,
              HeadingFeature({ enabledHeadingSizes: ['h3', 'h4'] }),
              BoldFeature(),
              ItalicFeature(),
              OrderedListFeature(),
              UnorderedListFeature(),
              FixedToolbarFeature(),
              InlineToolbarFeature(),
            ],
          }),
          required: true,
        },
        {
          name: 'stepImage',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      type: 'tabs',
      tabs: [
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({ hasGenerateFn: true }),
            MetaImageField({ relationTo: 'media' }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    ...slugField('title'),
  ],
  hooks: {
    afterChange: [
      ({ doc, req: { context } }) => {
        if (!context.disableRevalidate && doc._status === 'published') {
          revalidatePath(`/learn/tutorials/${doc.slug}`)
          revalidatePath('/learn')
        }
        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        revalidatePath(`/learn/tutorials/${doc?.slug}`)
        revalidatePath('/learn')
        return doc
      },
    ],
  },
  versions: {
    drafts: { autosave: true },
    maxPerDoc: 20,
  },
}
