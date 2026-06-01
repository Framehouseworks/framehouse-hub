'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import type { Media } from '@/payload-types'
import type { Where } from 'payload'

const PAGE_SIZE = 48

export interface CollectionFilters {
  types?: string[] // 'raw' | 'video' | 'image'
  camera?: string
  tag?: string
}

function buildFilterClauses(filters: CollectionFilters): Where[] {
  const clauses: Where[] = []

  if (filters.types?.length) {
    const typeClauses = filters.types.map((t): Where => {
      if (t === 'raw') return { mimeType: { like: 'image/x-raw%' } }
      if (t === 'video') return { mimeType: { like: 'video/%' } }
      // 'image' = raster images excluding raw
      return { and: [{ mimeType: { like: 'image/%' } }, { mimeType: { not_like: 'image/x-raw%' } }] }
    })
    clauses.push(typeClauses.length === 1 ? typeClauses[0] : { or: typeClauses })
  }

  if (filters.camera) clauses.push({ 'technical.cameraModel': { equals: filters.camera } })
  if (filters.tag) clauses.push({ 'manualTags.tag': { equals: filters.tag } })

  return clauses
}

export async function fetchCollectionMediaPage(
  collectionId: number,
  page: number,
  baseFilterQuery: Record<string, unknown>,
  manualExcludeIds: number[],
  filters: CollectionFilters,
): Promise<{ docs: Media[]; hasNextPage: boolean; totalDocs: number }> {
  const h = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: h })
  if (!user) throw new Error('Unauthorized')

  const hasBase = Object.keys(baseFilterQuery).length > 0
  const filterClauses = buildFilterClauses(filters)

  const where: Where = {
    and: [
      { owner: { equals: user.id } },
      ...(hasBase ? [baseFilterQuery as Where] : []),
      ...(manualExcludeIds.length > 0 ? [{ id: { not_in: manualExcludeIds } }] : []),
      ...filterClauses,
    ],
  }

  const { docs, totalDocs } = await payload.find({
    collection: 'media',
    where,
    sort: '-captureDate,-createdAt',
    limit: PAGE_SIZE,
    page,
    depth: 0,
  })

  return {
    docs: docs as Media[],
    hasNextPage: page * PAGE_SIZE < totalDocs,
    totalDocs,
  }
}

export interface ChipData {
  types: string[]
  cameras: string[]
  tags: string[]
}

/** Derives filter chip suggestions from a collection's first-page assets. */
export async function extractCollectionChips(
  collectionId: number,
  filterQuery: Record<string, unknown>,
  manualExcludeIds: number[],
): Promise<ChipData> {
  const h = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: h })
  if (!user) return { types: [], cameras: [], tags: [] }

  // Fetch a broader sample to derive chips
  void collectionId // satisfied by filterQuery from the collection
  const hasBase = Object.keys(filterQuery).length > 0

  const where: Where = {
    and: [
      { owner: { equals: user.id } },
      ...(hasBase ? [filterQuery as Where] : []),
      ...(manualExcludeIds.length > 0 ? [{ id: { not_in: manualExcludeIds } }] : []),
    ],
  }

  const { docs } = await payload.find({
    collection: 'media',
    where,
    limit: 200,
    depth: 0,
    select: { mimeType: true, technical: true, manualTags: true },
  })

  const typesSet = new Set<string>()
  const camerasMap = new Map<string, number>()
  const tagsMap = new Map<string, number>()

  for (const item of docs as Media[]) {
    const mime = item.mimeType || ''
    if (mime.startsWith('video/')) typesSet.add('video')
    else if (mime.startsWith('image/x-raw') || mime.includes('x-raw')) typesSet.add('raw')
    else if (mime.startsWith('image/')) typesSet.add('image')

    const cam = item.technical?.cameraModel
    if (cam) camerasMap.set(cam, (camerasMap.get(cam) ?? 0) + 1)

    const tags = item.manualTags as { tag?: string }[] | null
    if (tags) {
      for (const t of tags) {
        if (t.tag) tagsMap.set(t.tag, (tagsMap.get(t.tag) ?? 0) + 1)
      }
    }
  }

  const topCameras = [...camerasMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([c]) => c)

  const topTags = [...tagsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([t]) => t)

  return { types: [...typesSet], cameras: topCameras, tags: topTags }
}
