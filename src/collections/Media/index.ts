import { creativeOrAdmin } from '@/access/creativeOrAdmin'
import { ownerOrAdmin } from '@/access/ownerOrAdmin'
import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import type { CollectionConfig } from 'payload'
import { fileURLToPath } from 'url'
import { extractMetadata } from './hooks/extractMetadata'
import { preventDuplicates } from './hooks/preventDuplicates'
import { generateAccessionId } from './hooks/generateAccessionId'
import { triggerLocalWorker } from './hooks/triggerLocalWorker'
import { cleanupEnclave } from './hooks/cleanupEnclave'
import { writeOriginalToEnclave } from './hooks/writeOriginalToEnclave'
import { aliasUrl } from './hooks/aliasUrl'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Media: CollectionConfig = {
  slug: 'media',
  hooks: {
    beforeOperation: [preventDuplicates],
    beforeValidate: [],
    beforeChange: [writeOriginalToEnclave, generateAccessionId, extractMetadata],
    afterRead: [aliasUrl],
    afterChange: [triggerLocalWorker],
    afterDelete: [cleanupEnclave],
  },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'filename', 'mediaType', 'owner', 'createdAt'],
  },
  access: {
    read: () => true, // Allow layout and gallery to see media metadata/files
    create: creativeOrAdmin,
    update: ownerOrAdmin,
    delete: ownerOrAdmin,
  },
  upload: {
    // Originals live under the tenant enclave at
    //   public/media/tenants/{userId}/{domain}/{year}/{month}/{assetUUID}/original/{filename}
    // Payload's own local adapter would write a duplicate flat copy at
    // staticDir/{filename}, so we disable it. `writeOriginalToEnclave`
    // (beforeChange) owns the write; `cleanupEnclave` (afterDelete) owns the
    // teardown. Mirrors cloud-mode where the gcsStorage plugin / signed-url
    // flow already bypasses local storage.
    disableLocalStorage: true,
    // Cloud register-gcs creates docs with storagePath already populated —
    // bytes are in GCS via the signed-URL PUT, not in memory, so we can't
    // hand Payload a file arg. Without this flag, generateFileData throws
    // MissingFile on every cloud upload. Local mode still provides
    // req.file, so writeOriginalToEnclave continues to gate writes on it.
    filesRequiredOnCreate: false,
    staticDir: path.resolve(dirname, '../../../public/media'),
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
    // ---- DAM-specific fields (MVP) ---- //
    {
      name: 'storagePath',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'Canonical storage path (tenants/{userId}/{domain}/{year}/{month}/{assetId}/...).',
      },
    },
    {
      name: 'originalUrl',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'proxyUrl',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'thumbnailUrl',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'accessionId',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Permanent archival catalog code (e.g. FRH-2024-0001).',
      },
    },
    {
      name: 'archivalSequence',
      type: 'number',
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Atomic intake counter (1, 2, 3...) for scalable provenance.',
      },
    },
    {
      name: 'shootName',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Archival Shoot Identity (e.g. Wildlife Expedition 2024).',
      },
    },
    {
      // Links the asset to the ingest session it came in on (FRH-52
      // phase D). Nullable — older assets and seed fixtures without an
      // explicit batch leave this blank. ON DELETE SET NULL so deleting
      // a batch doesn't take the assets with it.
      name: 'uploadBatchId',
      type: 'relationship',
      relationTo: 'upload-batches',
      required: false,
      index: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'mediaType',
      type: 'select',
      options: [
        { label: 'Image', value: 'image' },
        { label: 'Raw', value: 'raw' },
        { label: 'Video', value: 'video' },
        { label: 'Audio', value: 'audio' },
        { label: 'Document', value: 'document' },
        { label: 'Unclassified', value: 'unclassified' },
      ],
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'ingestionStatus',
      type: 'select',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Processing', value: 'processing' },
        { label: 'Stale', value: 'stale' },
        { label: 'Ready', value: 'ready' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'active',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'processingStep',
      type: 'select',
      options: [
        { label: 'Upload Complete', value: 'upload_complete' },
        { label: 'EXIF Parsing', value: 'exif_parsing' },
        { label: 'Generating WebP', value: 'generating_webp' },
        { label: 'Registering Assets', value: 'registering_assets' },
        { label: 'Ready', value: 'ready' },
        { label: 'Failed', value: 'failed' },
      ],
      defaultValue: 'upload_complete',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    // ---- Normalized Technical Metadata ---- //
    {
      name: 'captureDate',
      type: 'date',
      index: true,
      admin: {
        description: 'Primary sort key. Extracted from EXIF or file date.',
        position: 'sidebar',
      },
    },
    {
      name: 'technical',
      type: 'group',
      label: 'Technical Metadata',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'cameraModel',
          type: 'text',
        },
        {
          name: 'lensModel',
          type: 'text',
        },
        {
          name: 'iso',
          type: 'number',
        },
        {
          name: 'aperture',
          type: 'number',
        },
        {
          name: 'shutterSpeed',
          type: 'text',
        },
        {
          name: 'focalLength',
          type: 'number',
        },
      ],
    },
    {
      name: 'location',
      type: 'group',
      fields: [
        {
          name: 'latitude',
          type: 'number',
        },
        {
          name: 'longitude',
          type: 'number',
        },
        {
          name: 'address',
          type: 'text',
        },
      ],
    },
    // ---- Classification ---- //
    {
      name: 'manualTags',
      type: 'array',
      label: 'Archival Tags',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
    {
      name: 'heuristicTags',
      type: 'array',
      label: 'System Tags',
      admin: {
        readOnly: true,
        description: 'Rule-based tags generated during ingestion (e.g. filename parsing).',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
    {
      name: 'filesize',
      type: 'number',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'width',
      type: 'number',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'height',
      type: 'number',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'aspectRatio',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Computed as width / height (e.g. 16:9).',
      },
    },
    {
      name: 'errorMessage',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'processedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
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
        readOnly: true,
        position: 'sidebar',
      },
    },
    // Legacy/System fields (Payload will populate these)
    {
      name: 'filename',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Slugified, path-safe filename used on disk + in storagePath.',
      },
    },
    {
      // Original upload name as supplied by the client. `filename` is slugified
      // for filesystem safety; this field preserves what the user actually sent
      // so download UX, audit logs, and search can show the human-readable name.
      name: 'originalFilename',
      type: 'text',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Original filename as uploaded (pre-slugify).',
      },
    },
    {
      name: 'mimeType',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
}
