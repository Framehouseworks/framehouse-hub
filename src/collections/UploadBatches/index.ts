import type { CollectionConfig } from 'payload'
import { creativeOrAdmin } from '@/access/creativeOrAdmin'
import { ownerOrAdmin } from '@/access/ownerOrAdmin'

// FRH-52 phase D: persists the ingest grouping the UI already implies.
// One UploadBatch is created per "Start Archival Ingest" click; every
// Media doc the user uploads in that session carries the batch id via
// the nullable `uploadBatchId` FK on media.
//
// Smallest viable shape — defer batch-level state (status, failedCount,
// retry-all) until there's a UI surface to use them. Asset count is
// derived on demand via payload.count, not stored.
export const UploadBatches: CollectionConfig = {
  slug: 'upload-batches',
  admin: {
    group: 'Content',
    useAsTitle: 'id',
    defaultColumns: ['id', 'owner', 'source', 'createdAt'],
    description:
      'Ingest grouping. One batch per user-initiated upload session; deleting a batch nullifies the FK on media (assets survive).',
  },
  access: {
    read: ownerOrAdmin,
    create: creativeOrAdmin,
    update: ownerOrAdmin,
    delete: ownerOrAdmin,
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      hooks: {
        beforeValidate: [
          ({ req, value }) => {
            if (req.user && !value) return req.user.id
            return value
          },
        ],
      },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'dashboard',
      options: [
        { label: 'Dashboard', value: 'dashboard' },
        { label: 'Admin', value: 'admin' },
        { label: 'Seed', value: 'seed' },
        { label: 'API', value: 'api' },
      ],
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'notes',
      type: 'text',
      admin: {
        description: 'Free-form admin note about this ingest session.',
      },
    },
  ],
  timestamps: true,
}
