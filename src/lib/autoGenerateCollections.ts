/**
 * FRH-47: Auto-generate Smart Collections from Media metadata.
 * Triggered when an UploadBatch transitions to ready.
 * Idempotent — safe to call repeatedly.
 */
import type { Payload } from 'payload'
import crypto from 'crypto'

const MIN_ASSETS = 3

function hashQuery(query: object): string {
  return crypto.createHash('sha256').update(JSON.stringify(query)).digest('hex').slice(0, 16)
}

type CollectionCandidate = {
  name: string
  filterQuery: object
  generatedFrom: 'media_type' | 'tags' | 'metadata'
  icon: 'folder' | 'tag' | 'sparkles' | 'camera' | 'map'
}

async function deduplicateName(
  payload: Payload,
  userId: number | string,
  name: string,
  queryHash: string,
): Promise<string | null> {
  // Check if identical query already exists → skip
  const { docs: existing } = await payload.find({
    collection: 'smart-collections',
    where: {
      and: [{ owner: { equals: userId } }, { name: { equals: name } }],
    },
    limit: 5,
    select: { filterQuery: true, name: true },
  })

  if (existing.some((c) => hashQuery(c.filterQuery as object) === queryHash)) {
    return null // identical query exists — skip
  }

  // Same name, different query → append suffix
  if (existing.length > 0) {
    return `${name} (2)`
  }
  return name
}

export async function generateSmartCollections(
  payload: Payload,
  userId: number | string,
): Promise<void> {
  // Pull distinct metadata values from user's media
  const { docs: allMedia } = await payload.find({
    collection: 'media',
    where: { owner: { equals: userId } },
    limit: 2000,
    select: {
      mediaType: true,
      shootName: true,
      manualTags: true,
      heuristicTags: true,
      technical: true,
      captureDate: true,
    },
  })

  if (allMedia.length === 0) return

  const candidates: CollectionCandidate[] = []

  // 1. Media type collections
  const mediaTypeCounts = allMedia.reduce(
    (acc, m) => {
      if (m.mediaType) acc[m.mediaType] = (acc[m.mediaType] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const mediaTypeLabels: Record<string, string> = {
    image: 'Photos',
    video: 'Videos',
    raw: 'RAW Files',
    audio: 'Audio',
    document: 'Documents',
  }

  for (const [type, count] of Object.entries(mediaTypeCounts)) {
    if (count >= MIN_ASSETS && mediaTypeLabels[type]) {
      candidates.push({
        name: mediaTypeLabels[type],
        filterQuery: { mediaType: { equals: type } },
        generatedFrom: 'media_type',
        icon: type === 'video' ? 'camera' : type === 'image' ? 'sparkles' : 'folder',
      })
    }
  }

  // 2. Shoot name collections
  const shootCounts = allMedia.reduce(
    (acc, m) => {
      if (m.shootName) acc[m.shootName] = (acc[m.shootName] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  for (const [shoot, count] of Object.entries(shootCounts)) {
    if (count >= MIN_ASSETS) {
      candidates.push({
        name: shoot,
        filterQuery: { shootName: { equals: shoot } },
        generatedFrom: 'metadata',
        icon: 'folder',
      })
    }
  }

  // 3. Manual tag collections
  const tagCounts = allMedia.reduce(
    (acc, m) => {
      for (const t of m.manualTags || []) {
        if (t.tag) acc[t.tag] = (acc[t.tag] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  for (const [tag, count] of Object.entries(tagCounts)) {
    if (count >= MIN_ASSETS) {
      candidates.push({
        name: tag,
        filterQuery: { 'manualTags.tag': { in: [tag] } },
        generatedFrom: 'tags',
        icon: 'tag',
      })
    }
  }

  // 4. Heuristic tag collections
  const heuristicCounts = allMedia.reduce(
    (acc, m) => {
      for (const t of m.heuristicTags || []) {
        if (t.tag) acc[t.tag] = (acc[t.tag] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  for (const [tag, count] of Object.entries(heuristicCounts)) {
    if (count >= MIN_ASSETS) {
      candidates.push({
        name: tag,
        filterQuery: { 'heuristicTags.tag': { in: [tag] } },
        generatedFrom: 'tags',
        icon: 'sparkles',
      })
    }
  }

  // 5. Camera model collections
  const cameraCounts = allMedia.reduce(
    (acc, m) => {
      const cam = (m.technical as Record<string, unknown> | null)?.cameraModel as
        | string
        | undefined
      if (cam) acc[cam] = (acc[cam] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  for (const [cam, count] of Object.entries(cameraCounts)) {
    if (count >= MIN_ASSETS) {
      candidates.push({
        name: cam,
        filterQuery: { 'technical.cameraModel': { equals: cam } },
        generatedFrom: 'metadata',
        icon: 'camera',
      })
    }
  }

  // 6. Year-month collections (captureDate)
  const monthCounts = allMedia.reduce(
    (acc, m) => {
      if (!m.captureDate) return acc
      const d = new Date(m.captureDate as string)
      if (isNaN(d.getTime())) return acc
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  for (const [ym, count] of Object.entries(monthCounts)) {
    if (count >= MIN_ASSETS) {
      const [year, month] = ym.split('-')
      const start = new Date(`${year}-${month}-01T00:00:00.000Z`)
      const end = new Date(start)
      end.setMonth(end.getMonth() + 1)
      const label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      candidates.push({
        name: label,
        filterQuery: {
          and: [
            { captureDate: { greater_than_equal: start.toISOString() } },
            { captureDate: { less_than: end.toISOString() } },
          ],
        },
        generatedFrom: 'metadata',
        icon: 'folder',
      })
    }
  }

  // Create collections (deduplicated, idempotent)
  for (const candidate of candidates) {
    const queryHash = hashQuery(candidate.filterQuery)
    const resolvedName = await deduplicateName(payload, userId, candidate.name, queryHash)
    if (!resolvedName) continue // identical query already exists

    // FRH-47: cast to any — new fields not yet in generated payload-types.ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      name: resolvedName,
      owner: userId as number,
      filterQuery: candidate.filterQuery,
      isSystemGenerated: true,
      isHidden: false,
      sortOrder: 0,
      generatedFrom: candidate.generatedFrom,
      icon: candidate.icon,
    }
    await payload.create({ collection: 'smart-collections', data })
  }
}
