import type { CollectionConfig } from 'payload'

export const Waitlist: CollectionConfig = {
  slug: 'waitlist',
  admin: {
    useAsTitle: 'email',
    group: 'Content',
    description: 'Email signups for Coming Soon page. Minimal pre-launch list.',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => false,
    delete: () => true,
  },
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'text',
      admin: {
        description: 'Optional subscriber name.',
      },
    },
  ],
  timestamps: true,
}
