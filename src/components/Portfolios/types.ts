import type { Media, Portfolio } from '@/payload-types'

export type GridItemSize = 'small' | 'medium' | 'large' | 'full'

export type VideoThumbnailMode = 'auto' | 'timecode' | 'custom'

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

export interface WizardState {
  portfolioId: number | null
  name: string
  title: string
  subtitle: string
  description: string
  items: WizardGridItem[]
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
  theme: {
    fontPairing: 'modern-sans',
    backgroundColor: '#000000',
    textColor: '#ffffff',
    accentColor: '#ffffff',
  },
  visibility: 'private',
}

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

/** Converts WizardGridItem array to the Payload layoutBlocks grid structure */
export function itemsToLayoutBlocks(items: WizardGridItem[]): Portfolio['layoutBlocks'] {
  if (items.length === 0) return []
  return [
    {
      blockType: 'grid',
      items: items.map((item) => ({
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
              timecodeSeconds: item.videoThumbnail.timecodeSeconds,
              customMedia:
                item.videoThumbnail.customMedia &&
                typeof item.videoThumbnail.customMedia === 'object'
                  ? (item.videoThumbnail.customMedia as Media).id
                  : (item.videoThumbnail.customMedia as number | null | undefined),
            }
          : { mode: 'auto' },
      })),
      spacing: 'medium',
    },
  ]
}

/** Media type helpers */
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
  // Use proxy (compressed) for in-browser playback — never the original
  return media.proxyUrl || media.thumbnailUrl || null
}

export function isMediaReady(media: Media): boolean {
  return media.ingestionStatus === 'ready' || media.ingestionStatus === 'active'
}
