/**
 * ProductPageData
 *
 * Manual type mirroring the ProductPage global schema.
 * Replace with `import { ProductPage } from '@/payload-types'` after running
 * `pnpm payload migrate:create && pnpm generate:types`.
 */
export type ProductPageData = {
  heroHeading: string
  heroSubheading: string
  heroPrimaryLabel: string
  heroSecondaryLabel: string
  overviewHeading: string
  overviewItems: { label: string; description: string; icon: string }[]
  storageHeading: string
  storageSubheading: string
  storageActiveLabel: string
  storageActiveDescription: string
  storageArchiveLabel: string
  storageArchiveDescription: string
  orgHeading: string
  orgSubheading: string
  orgFeatures: { label: string; description: string }[]
  portfolioHeading: string
  portfolioSubheading: string
  portfolioBody: string
  portfolioComingSoon: boolean
  sharingHeading: string
  sharingSubheading: string
  sharingBody: string
  sharingComingSoon: boolean
  workflowHeading: string
  workflowSteps: { label: string; description: string }[]
  metaTitle: string
  metaDescription: string
}

export const PRODUCT_PAGE_DEFAULTS: ProductPageData = {
  heroHeading: 'Every frame, exactly where it belongs.',
  heroSubheading:
    "Framehouse Hub gives independent creatives a structured home for their media — from the moment it's captured to the day it's shared.",
  heroPrimaryLabel: 'Start for free',
  heroSecondaryLabel: 'See pricing',

  overviewHeading: 'One platform. The full picture.',
  overviewItems: [
    {
      label: 'Ingestion',
      description: 'Upload from anywhere. Originals land safely, intact, and immediately findable.',
      icon: 'upload',
    },
    {
      label: 'Organisation',
      description: 'Sessions, collections, and tags that reflect how creatives actually think.',
      icon: 'folder',
    },
    {
      label: 'Portfolios',
      description: 'Gallery-quality presentations, generated directly from your library.',
      icon: 'grid',
    },
    {
      label: 'Delivery',
      description: 'Share selectively with clients — with controls, expiry, and peace of mind.',
      icon: 'share',
    },
  ],

  storageHeading: 'A home for your originals.',
  storageSubheading:
    "Upload once. Access always. Every original is preserved in full resolution, automatically organised by date, type, and shoot — exactly where you'd expect.",
  storageActiveLabel: 'Active Library',
  storageActiveDescription:
    'Frequently accessed work lives here — fast retrieval, rich metadata, always a search away.',
  storageArchiveLabel: 'Cold Archive',
  storageArchiveDescription:
    'Long-term storage for completed projects. Preserved with integrity, recalled when needed.',

  orgHeading: 'Structure that works like you do.',
  orgSubheading:
    'Your library, your logic. Group work into Sessions, slice across it with Smart Collections, and tag freely — everything surfaces exactly when you need it.',
  orgFeatures: [
    {
      label: 'Sessions',
      description:
        'Group assets by shoot or project. A natural, chronological home for each body of work.',
    },
    {
      label: 'Smart Collections',
      description:
        'Dynamic views that update as your library grows. Filter by camera, date, tag, or type.',
    },
    {
      label: 'Tags & Metadata',
      description: 'Rich, searchable metadata attached at ingest. Find anything in seconds.',
    },
    {
      label: 'Folder Hierarchy',
      description: 'Familiar folder structure for creatives who prefer manual organisation.',
    },
  ],

  portfolioHeading: 'Your work, gallery-ready.',
  portfolioSubheading:
    'Turn any collection into a polished, public-facing portfolio — no design skills required. Choose a layout, publish a link.',
  portfolioBody:
    'Portfolios pull directly from your library. As your work evolves, they stay current. One source. Infinite presentation.',
  portfolioComingSoon: true,

  sharingHeading: 'Delivery, without the back-and-forth.',
  sharingSubheading:
    'Send clients exactly what they need — nothing more. Password-protected links, expiry dates, and download controls give you confidence at every handoff.',
  sharingBody:
    'Built for the creative relationship: present your work, gather feedback, and close the loop without chasing emails.',
  sharingComingSoon: true,

  workflowHeading: 'The full creative lifecycle, connected.',
  workflowSteps: [
    {
      label: 'Upload',
      description:
        'Drag in your originals. Full-resolution files are stored securely the moment they land.',
    },
    {
      label: 'Organise',
      description: 'Assign to Sessions, apply tags, let Smart Collections do the rest.',
    },
    {
      label: 'Curate',
      description:
        'Build a portfolio from any selection. Arrange, refine, and preview before publishing.',
    },
    {
      label: 'Share',
      description: 'Send a controlled link to clients — or publish publicly with a single click.',
    },
  ],

  metaTitle: 'Product | Framehouse Hub',
  metaDescription:
    'Discover how Framehouse Hub organises, archives, and shares your creative media — from upload to delivery.',
}
