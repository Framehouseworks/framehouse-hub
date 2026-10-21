import path from 'path'
import { fileURLToPath } from 'url'
import type { CollectionConfig } from 'payload'
import { transferWallpapersAccess } from './access'
import { validateDateRange } from './hooks/validateDateRange'
import { signWallpaperUrls } from './hooks/signWallpaperUrls'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const TransferWallpapers: CollectionConfig = {
  slug: 'transfer-wallpapers',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: [
      'title',
      'artistCredit',
      'sponsorshipStatus',
      'status',
      'displayDurationSeconds',
      'startDate',
      'endDate',
    ],
    description: 'Curated and sponsored full-screen background artwork for transfer download pages.',
  },
  access: transferWallpapersAccess,
  upload: {
    staticDir: path.resolve(dirname, '../../../../public/wallpapers'),
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
    filesRequiredOnCreate: false,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 320,
        height: 180,
        position: 'centre',
      },
      {
        name: 'desktop',
        width: 2560,
        height: 1440,
        position: 'centre',
      },
    ],
  },
  hooks: {
    beforeValidate: [validateDateRange],
    afterRead: [signWallpaperUrls],
  },
  fields: [
    {
      name: 'prefix',
      type: 'text',
      defaultValue: 'wallpapers',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Artwork or campaign display title.',
      },
    },
    {
      name: 'assetUrl',
      type: 'text',
      admin: {
        description: 'External CDN or public storage URL. If an image file is uploaded above, this is optional and will default to the uploaded file URL.',
      },
    },
    {
      name: 'mobileAssetUrl',
      type: 'text',
      admin: {
        description: 'Optional HTTPS URL or crop for mobile viewports.',
      },
    },
    {
      name: 'artistCredit',
      type: 'text',
      required: true,
      admin: {
        description: 'Creator attribution (e.g. "Artwork by Studio K" or "Photo by Jane Doe").',
      },
    },
    {
      name: 'clickThroughUrl',
      type: 'text',
      admin: {
        description: 'Destination URL when recipient clicks artist/campaign attribution badge.',
      },
    },
    {
      name: 'sponsorshipStatus',
      type: 'select',
      required: true,
      defaultValue: 'editorial',
      options: [
        { label: 'Editorial', value: 'editorial' },
        { label: 'Sponsored', value: 'sponsored' },
      ],
      admin: {
        position: 'sidebar',
        description: 'Sponsorship tier for brand takeovers vs curated editorial artwork.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Archived', value: 'archived' },
      ],
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Curation availability state.',
      },
    },
    {
      name: 'displayDurationSeconds',
      type: 'number',
      required: true,
      defaultValue: 45,
      min: 5,
      max: 300,
      validate: (val: any) => {
        if (typeof val !== 'number' || val < 5 || val > 300) {
          return 'Duration must be between 5 and 300 seconds'
        }
        return true
      },
      admin: {
        position: 'sidebar',
        description: 'Display duration in seconds before rotating to next wallpaper (min: 5s, max: 300s, default: 45s).',
      },
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Schedule start date/time (default: now).',
      },
    },
    {
      name: 'endDate',
      type: 'date',
      index: true,
      validate: (val: any, { siblingData }: any) => {
        if (val && siblingData?.startDate) {
          const start = new Date(siblingData.startDate).getTime()
          const end = new Date(val).getTime()
          if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
            return 'End date must be after or equal to start date.'
          }
        }
        return true
      },
      admin: {
        position: 'sidebar',
        description: 'Optional schedule end date/time.',
      },
    },
    {
      name: 'weight',
      type: 'number',
      required: true,
      defaultValue: 100,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Rotation priority weight (higher values appear earlier or more frequently).',
      },
    },
    {
      name: 'focalPoint',
      type: 'select',
      defaultValue: 'center',
      options: [
        { label: 'Center', value: 'center' },
        { label: 'Top', value: 'top' },
        { label: 'Bottom', value: 'bottom' },
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
      admin: {
        position: 'sidebar',
        description: 'CSS object-position focal point.',
      },
    },
  ],
  timestamps: true,
}
