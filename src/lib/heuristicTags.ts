/**
 * Shared heuristic tag generation logic.
 *
 * Split into its own module so both `extractMetadata` (sync/local mode)
 * and `process-callback` (cloud/async mode) can call identical logic.
 *
 * Returns `{ tag: string }[]` ready for Payload array fields.
 */

export interface HeuristicTagInput {
  captureDate?: string | null
  filename?: string | null
}

export function buildHeuristicTags(input: HeuristicTagInput): { tag: string }[] {
  const tags = new Set<string>()

  // 1. Filename-derived tags (works before EXIF is available)
  if (input.filename) {
    const parts = input.filename.split(/[._\-\s]+/)
    for (const part of parts) {
      const trimmed = part.trim()
      // Skip short tokens, pure numbers, and common filler words
      if (
        trimmed.length <= 3 ||
        /^\d+$/.test(trimmed) ||
        /^(img|dsc|raw|jpg|jpeg|png|mp4|mov|tif|tiff|heic)$/i.test(trimmed)
      ) {
        continue
      }
      tags.add(trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase())
    }
  }

  // 2. Temporal tags (require captureDate — added when EXIF is available)
  if (input.captureDate) {
    try {
      const date = new Date(input.captureDate)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const month = date.getMonth() // 0-11

        // Season
        let season: string
        if (month >= 2 && month <= 4) season = 'Spring'
        else if (month >= 5 && month <= 7) season = 'Summer'
        else if (month >= 8 && month <= 10) season = 'Autumn'
        else season = 'Winter'

        tags.add(`${season} ${year}`)

        // Golden hour approximation (4–7 PM local time)
        const hour = date.getHours()
        if (hour >= 16 && hour <= 19) {
          tags.add('Golden Hour')
        }
      }
    } catch {
      // non-fatal — just skip temporal tags
    }
  }

  return Array.from(tags).map((t) => ({ tag: t }))
}

/**
 * Merge new tags into an existing array, deduplicating by tag value.
 * Preserves existing entries (including their Payload-generated ids).
 */
export function mergeHeuristicTags(
  existing: { tag?: string | null; id?: string | null }[] | null | undefined,
  incoming: { tag: string }[],
): { tag: string }[] {
  const seen = new Set<string>()
  const merged: { tag: string }[] = []

  for (const e of existing || []) {
    if (e.tag) {
      seen.add(e.tag)
      merged.push({ tag: e.tag })
    }
  }

  for (const t of incoming) {
    if (!seen.has(t.tag)) {
      seen.add(t.tag)
      merged.push(t)
    }
  }

  return merged
}
