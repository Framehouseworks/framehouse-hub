import type { Media, Portfolio } from '@/payload-types'

export type GridItemSize = 'small' | 'medium' | 'large' | 'full'

export type VideoThumbnailMode = 'auto' | 'timecode' | 'custom'

export type SectionLayoutStyle = 'masonry' | 'filmstrip' | 'uniform_grid'
export type SectionWidth = 'full' | 'wide' | 'contained' | 'narrow'

export type FilmstripTrackHeight = 'compact' | 'comfortable' | 'editorial'

// Payload select values are strings — renderer calls parseInt() (C-4)
export type UniformGridColumns = '2' | '3' | '4'

export interface FocalPoint {
  x: number
  y: number
}

export interface VideoThumbnailOverride {
  mode: VideoThumbnailMode
  timecodeSeconds?: number
  customMedia?: number | Media | null
}

export interface WizardGridItem {
  instanceId: string
  media: Media
  size: GridItemSize
  alt?: string | null
  caption?: string | null
  link?: string | null
  instanceTitle?: string | null
  focalPoint?: FocalPoint | null
  videoThumbnail?: VideoThumbnailOverride | null
}

/**
 * A WizardSection maps 1:1 to a Payload GridBlock.
 * id = block.id when hydrated from server; 'new-{uuid}' for unsaved sections. (C-5)
 */
export interface WizardSection {
  id: string
  sectionName: string
  showSectionHeader: boolean
  layoutStyle: SectionLayoutStyle
  filmstripTrackHeight: FilmstripTrackHeight
  uniformGridColumns: UniformGridColumns
  preserveAspectRatio: boolean
  sectionWidth: SectionWidth
  items: WizardGridItem[]
}

export interface WizardState {
  portfolioId: number | null
  name: string
  title: string
  subtitle: string
  description: string
  items: WizardGridItem[]         // flat pool — used by Step 2
  sections: WizardSection[]       // structured sections — used by Step 3+
  sectionMode: boolean            // true once Step 3 has been visited
  layoutSpacing: 'small' | 'medium' | 'large' | 'none'  // applied to all grid block spacing fields
  theme: {
    fontPairing: 'modern-sans' | 'classic-serif' | 'tech-mono'
    backgroundColor: string
    textColor: string
    accentColor: string
  }
  visibility: 'private' | 'public' | 'shared'
  password?: string
  loadedAt?: string
}

export const DEFAULT_WIZARD_STATE: WizardState = {
  portfolioId: null,
  name: '',
  title: '',
  subtitle: '',
  description: '',
  items: [],
  sections: [],
  sectionMode: false,
  layoutSpacing: 'medium',
  theme: {
    fontPairing: 'modern-sans',
    backgroundColor: '#000000',
    textColor: '#ffffff',
    accentColor: '#ffffff',
  },
  visibility: 'private',
}

// ── Rich text helpers ───────────────────────────────────────────────────────

/** Extracts plain text from a Payload Lexical rich-text root */
export function extractRichTextPlain(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const root = (data as { root?: unknown }).root
  if (!root || typeof root !== 'object') return ''
  const children = (root as { children?: unknown[] }).children
  if (!Array.isArray(children)) return ''

  function extractNode(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as Record<string, unknown>
    if (typeof n.text === 'string') return n.text
    if (Array.isArray(n.children)) return (n.children as unknown[]).map(extractNode).join('')
    return ''
  }

  return children.map(extractNode).join(' ').trim()
}

/** Builds a Lexical rich-text doc from a plain string */
export function plainTextToLexical(text: string) {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text, version: 1 }],
          direction: 'ltr' as const,
          format: '' as const,
          indent: 0,
          version: 1,
        },
      ],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    },
  }
}

// ── Layout block serialisation ──────────────────────────────────────────────

type GridBlockItem = {
  id?: string
  instanceId?: string
  media: number
  size: GridItemSize
  alt?: string | null
  caption?: string | null
  link?: string | null
  instanceTitle?: string | null
  focalPoint?: { x: number; y: number }
  videoThumbnail?: {
    mode: VideoThumbnailMode
    timecodeSeconds?: number | null
    customMedia?: number | null
  }
}

function wizardItemToGridItem(item: WizardGridItem): GridBlockItem {
  return {
    id: item.instanceId,
    instanceId: item.instanceId,
    media: item.media.id,
    size: item.size,
    alt: item.alt,
    caption: item.caption,
    link: item.link,
    instanceTitle: item.instanceTitle,
    focalPoint: item.focalPoint
      ? { x: item.focalPoint.x, y: item.focalPoint.y }
      : { x: 50, y: 50 },
    videoThumbnail: item.videoThumbnail
      ? {
          mode: item.videoThumbnail.mode,
          timecodeSeconds: item.videoThumbnail.timecodeSeconds ?? null,
          customMedia:
            item.videoThumbnail.customMedia &&
            typeof item.videoThumbnail.customMedia === 'object'
              ? (item.videoThumbnail.customMedia as Media).id
              : (item.videoThumbnail.customMedia as number | null | undefined) ?? null,
        }
      : { mode: 'auto' as const },
  }
}

/**
 * Legacy helper — converts a flat items array to a single grid block.
 * Used by the wizard until Step 3 is visited (sectionMode = false).
 */
export function itemsToLayoutBlocks(items: WizardGridItem[], spacing: string = 'medium'): Portfolio['layoutBlocks'] {
  if (items.length === 0) return []
  return [
    {
      blockType: 'grid',
      items: items.map(wizardItemToGridItem),
      spacing: spacing as 'small' | 'medium' | 'large' | 'none',
    },
  ] as Portfolio['layoutBlocks']
}

/**
 * Converts WizardSection array to Payload layoutBlocks.
 * Preserves block.id for existing sections; omits id for new ('new-' prefix) sections
 * so Payload auto-assigns an id on create. (C-5)
 */
export function sectionsToLayoutBlocks(sections: WizardSection[], spacing: string = 'medium'): Portfolio['layoutBlocks'] {
  return sections.map((section) => {
    const block: Record<string, unknown> = {
      blockType: 'grid',
      sectionName: section.sectionName,
      showSectionHeader: section.showSectionHeader,
      layoutStyle: section.layoutStyle,
      filmstripTrackHeight: section.filmstripTrackHeight,
      uniformGridColumns: section.uniformGridColumns,
      preserveAspectRatio: section.preserveAspectRatio,
      sectionWidth: section.sectionWidth,
      spacing,
      items: section.items.map(wizardItemToGridItem),
    }
    // Only pass block.id for server-assigned UUIDs. auto-*, new-*, legacy-* are
    // client-side DnD keys — Payload rejects them as invalid UUID block ids. (C-5)
    const isServerUuid = !section.id.startsWith('new-') &&
      !section.id.startsWith('auto-') &&
      !section.id.startsWith('legacy-')
    if (isServerUuid) {
      block.id = section.id
    }
    return block
  }) as Portfolio['layoutBlocks']
}

/**
 * Hydrates WizardSection[] from a Payload layoutBlocks response.
 * Uses block.id as the DnD key for round-trip stability. (C-5)
 */
export function hydrateServerSections(
  layoutBlocks: NonNullable<Portfolio['layoutBlocks']>,
): WizardSection[] {
  return layoutBlocks
    .filter((b) => b.blockType === 'grid')
    .map((b, index) => {
      const block = b as Record<string, unknown>
      const rawItems = Array.isArray(block.items) ? (block.items as Record<string, unknown>[]) : []
      return {
        // Use Payload's persistent block.id for DnD key stability. (C-5, Issue-13)
        // For legacy blocks without an id, use position-based fallback (stable within one session).
        id: (block.id as string | undefined) ?? `legacy-${index}`,
        sectionName: (block.sectionName as string | undefined) ?? '',
        showSectionHeader: Boolean(block.showSectionHeader),
        layoutStyle: ((block.layoutStyle as string | undefined) ?? 'masonry') as SectionLayoutStyle,
        filmstripTrackHeight: (
          (block.filmstripTrackHeight as string | undefined) ?? 'comfortable'
        ) as FilmstripTrackHeight,
        uniformGridColumns: (
          (block.uniformGridColumns as string | undefined) ?? '3'
        ) as UniformGridColumns,
        preserveAspectRatio: Boolean(block.preserveAspectRatio ?? false),
        sectionWidth: ((block.sectionWidth as string | undefined) ?? 'full') as SectionWidth,
        items: rawItems.flatMap((item) => {
          const mediaObj = item.media as Media | number | null | undefined
          if (!mediaObj || typeof mediaObj !== 'object') return []
          return [
            {
              instanceId: (item.instanceId as string | undefined) ?? (item.id as string) ?? crypto.randomUUID(),
              media: mediaObj as Media,
              size: ((item.size as string | undefined) ?? 'medium') as GridItemSize,
              alt: item.alt as string | null | undefined,
              caption: item.caption as string | null | undefined,
              link: item.link as string | null | undefined,
              instanceTitle: item.instanceTitle as string | null | undefined,
              focalPoint: item.focalPoint as FocalPoint | null | undefined,
              videoThumbnail: item.videoThumbnail as VideoThumbnailOverride | null | undefined,
            } satisfies WizardGridItem,
          ]
        }),
      } satisfies WizardSection
    })
}

// ── Auto-parse ──────────────────────────────────────────────────────────────

function mimeCategory(media: Media): 'video' | 'image' | 'other' {
  if (media.mediaType === 'video') return 'video'
  if (media.mediaType === 'image' || media.mediaType === 'raw') return 'image'
  return 'other'
}

const MIME_ORDER: Array<'video' | 'image' | 'other'> = ['video', 'image', 'other']
const MIME_LABEL: Record<'video' | 'image' | 'other', string> = {
  video: 'Videos',
  image: 'Images',
  other: 'Files',
}
const MIME_LAYOUT: Record<'video' | 'image' | 'other', SectionLayoutStyle> = {
  video: 'filmstrip',
  image: 'masonry',
  other: 'uniform_grid',
}

/**
 * Groups a flat items pool into WizardSection[] by MIME type category.
 * Uses deterministic IDs (e.g. 'auto-video') so re-runs don't regenerate DnD keys (Issue 7).
 */
export function autoParseSections(items: WizardGridItem[]): WizardSection[] {
  const groups = new Map<'video' | 'image' | 'other', WizardGridItem[]>()
  for (const item of items) {
    const cat = mimeCategory(item.media)
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(item)
  }

  const sections: WizardSection[] = []
  for (const cat of MIME_ORDER) {
    const catItems = groups.get(cat)
    if (!catItems?.length) continue
    sections.push({
      id: `auto-${cat}`,
      sectionName: MIME_LABEL[cat],
      showSectionHeader: false,
      layoutStyle: MIME_LAYOUT[cat],
      filmstripTrackHeight: 'comfortable',
      uniformGridColumns: '3',
      preserveAspectRatio: false,
      sectionWidth: 'full',
      items: catItems,
    })
  }

  // Fallback: if pool is empty or no items, produce at least one section
  if (sections.length === 0) {
    sections.push({
      id: 'auto-all',
      sectionName: 'All Assets',
      showSectionHeader: false,
      layoutStyle: 'masonry',
      filmstripTrackHeight: 'comfortable',
      uniformGridColumns: '3',
      preserveAspectRatio: false,
      sectionWidth: 'full',
      items,
    })
  }

  return sections
}

// ── Media helpers ───────────────────────────────────────────────────────────

export function isVideoMedia(media: Media): boolean {
  return media.mediaType === 'video'
}

export function isImageMedia(media: Media): boolean {
  return media.mediaType === 'image' || media.mediaType === 'raw'
}

export function getMediaPreviewUrl(media: Media): string | null {
  return media.thumbnailUrl || media.proxyUrl || media.originalUrl || media.url || null
}

export function getVideoPreviewUrl(media: Media): string | null {
  return media.proxyUrl || media.thumbnailUrl || null
}

export function isMediaReady(media: Media): boolean {
  return media.ingestionStatus === 'ready' || media.ingestionStatus === 'active'
}
