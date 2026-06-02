'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Portfolio } from '@/payload-types'

export type PortfolioActionResult<T = unknown> = {
  success: boolean
  message: string
  data?: T
}

async function getAuth() {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })
  return { payload, user }
}

/** Fetch all portfolios owned by the current user */
export async function fetchMyPortfoliosAction(): Promise<
  PortfolioActionResult<{ docs: Portfolio[]; totalDocs: number }>
> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    const result = await payload.find({
      collection: 'portfolios',
      where: { owner: { equals: user.id } },
      sort: '-updatedAt',
      limit: 100,
      depth: 1, // depth:1 required so layoutBlocks items.media has thumbnailUrl for cover mosaic
      draft: true,
      user,
    })

    return { success: true, message: 'OK', data: { docs: result.docs as Portfolio[], totalDocs: result.totalDocs } }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to fetch portfolios' }
  }
}

/** Fetch a single portfolio by ID (owner + admin only) */
export async function fetchPortfolioByIdAction(
  id: number,
): Promise<PortfolioActionResult<Portfolio>> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    const doc = await payload.findByID({
      collection: 'portfolios',
      id,
      depth: 2,
      draft: true,
      user,
    })

    return { success: true, message: 'OK', data: doc as Portfolio }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Not found' }
  }
}

/** Create a new draft portfolio */
export async function createDraftPortfolioAction(
  name: string,
): Promise<PortfolioActionResult<Portfolio>> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    // title is NOT NULL in the DB schema — supply a minimal Lexical doc from name
    const titleDoc = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: name, version: 1 }],
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

    const doc = await payload.create({
      collection: 'portfolios',
      data: {
        name,
        title: titleDoc,
        owner: user.id,
        visibility: 'private',
        layoutBlocks: [],
      },
      draft: true,
      user,
    })

    revalidatePath('/dashboard/portfolios')
    return { success: true, message: 'Draft created', data: doc as Portfolio }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to create' }
  }
}

// Enterprise server-side limits (Issues 4 & 5)
const MAX_SECTIONS_SERVER = 20    // max grid blocks per portfolio
const MAX_ITEMS_SERVER = 100      // max total items across all grid blocks

/**
 * Validates layoutBlocks against enterprise limits.
 * Returns an error string if limits are exceeded, null if valid.
 */
function validateLayoutBlocks(blocks: unknown): string | null {
  if (!Array.isArray(blocks)) return null
  const gridBlocks = blocks.filter((b) => (b as Record<string, unknown>).blockType === 'grid')
  if (gridBlocks.length > MAX_SECTIONS_SERVER) {
    return `Portfolio may not exceed ${MAX_SECTIONS_SERVER} sections (got ${gridBlocks.length})`
  }
  const totalItems = gridBlocks.reduce((sum, b) => {
    const items = (b as Record<string, unknown>).items
    return sum + (Array.isArray(items) ? items.length : 0)
  }, 0)
  if (totalItems > MAX_ITEMS_SERVER) {
    return `Portfolio may not exceed ${MAX_ITEMS_SERVER} total assets (got ${totalItems})`
  }
  return null
}

/** Save (autosave) a portfolio draft — with optional optimistic concurrency check */
export async function savePortfolioDraftAction(
  id: number,
  data: Partial<Portfolio>,
  ifUnmodifiedSince?: string,
): Promise<PortfolioActionResult<Portfolio>> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    // Enterprise: validate section/item limits server-side (Issues 4 & 5)
    const limitError = validateLayoutBlocks(data.layoutBlocks)
    if (limitError) return { success: false, message: limitError }

    // Concurrency check: if caller provides a known-good timestamp, verify nothing changed
    if (ifUnmodifiedSince) {
      const current = await payload.findByID({
        collection: 'portfolios',
        id,
        depth: 0,
        draft: true,
        user,
      })
      if (current && current.updatedAt !== ifUnmodifiedSince) {
        return { success: false, message: 'conflict:409' }
      }
    }

    const { id: _id, updatedAt: _updatedAt, createdAt: _createdAt, ...updateData } = data as Record<string, unknown>

    const doc = await payload.update({
      collection: 'portfolios',
      id,
      data: updateData,
      draft: true,
      user,
    })

    return { success: true, message: 'Saved', data: doc as Portfolio }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to save' }
  }
}

/** Publish a portfolio (set _status: published) */
export async function publishPortfolioAction(
  id: number,
  data: Partial<Portfolio>,
): Promise<PortfolioActionResult<Portfolio>> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    const { id: _id, updatedAt: _updatedAt, createdAt: _createdAt, ...updateData } = data as Record<string, unknown>

    // Payload's publish path (draft: false) does NOT set _status unless the
    // caller explicitly passes _status: 'published' in data.  Without it,
    // the existing _status: 'draft' persists and queryDrafts (draft:true) returns
    // the "latest" version still showing draft, making the portfolio appear unfinished.
    const doc = await payload.update({
      collection: 'portfolios',
      id,
      data: { ...updateData, _status: 'published' },
      user,
    })

    // 'page' scope ensures the client-side router cache for the list page is
    // invalidated so the next navigation delivers the server-fetched fresh snapshot.
    revalidatePath('/dashboard/portfolios', 'page')
    revalidatePath(`/p/${(doc as Portfolio).slug}`, 'page')
    return { success: true, message: 'Published', data: doc as Portfolio }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to publish' }
  }
}

/** Delete a portfolio */
export async function deletePortfolioAction(id: number): Promise<PortfolioActionResult> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    await payload.delete({ collection: 'portfolios', id, user })

    revalidatePath('/dashboard/portfolios')
    return { success: true, message: 'Deleted' }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete' }
  }
}

/** Duplicate a portfolio */
export async function duplicatePortfolioAction(id: number): Promise<PortfolioActionResult<Portfolio>> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    const original = await payload.findByID({ collection: 'portfolios', id, depth: 0, user })
    if (!original) return { success: false, message: 'Not found' }

    const { id: _id, slug: _slug, updatedAt: _updatedAt, createdAt: _createdAt, folder: _folder, ...rest } = original as unknown as Record<string, unknown>

    const restData = rest as Partial<Portfolio>
    const doc = await payload.create({
      collection: 'portfolios',
      data: {
        ...restData,
        name: `${restData.name ?? 'Portfolio'} (Copy)`,
        owner: user.id,
        visibility: 'private',
      },
      draft: true,
      user,
    })

    revalidatePath('/dashboard/portfolios')
    return { success: true, message: 'Duplicated', data: doc as Portfolio }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to duplicate' }
  }
}

/** Fetch specific media documents by IDs (for preloading wizard) */
export async function fetchMediaByIdsAction(
  ids: number[],
): Promise<PortfolioActionResult<import('@/payload-types').Media[]>> {
  if (!ids.length) return { success: true, message: 'OK', data: [] }
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    const result = await payload.find({
      collection: 'media',
      where: { and: [{ id: { in: ids } }, { owner: { equals: user.id } }] },
      limit: ids.length,
      depth: 0,
    })

    // Preserve original order
    const byId = new Map(result.docs.map((d) => [d.id, d]))
    const ordered = ids.filter((id) => byId.has(id)).map((id) => byId.get(id)!)

    return { success: true, message: 'OK', data: ordered as import('@/payload-types').Media[] }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed' }
  }
}

/** Fetch user's media for the asset picker */
export async function fetchMediaForPickerAction(opts: {
  page?: number
  search?: string
  mediaType?: string
}): Promise<PortfolioActionResult<{ docs: import('@/payload-types').Media[]; hasNextPage: boolean; totalDocs: number }>> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    const { page = 1, search, mediaType } = opts
    const PAGE_SIZE = 48

    const andClauses: import('payload').Where[] = [
      { owner: { equals: user.id } },
      // Include null-status items — SQL `!= 'failed'` excludes NULLs; use OR to keep them
      { or: [{ ingestionStatus: { not_equals: 'failed' } }, { ingestionStatus: { exists: false } }] } as import('payload').Where,
    ]

    if (search) andClauses.push({
      or: [
        { title: { like: search } },
        { filename: { like: search } },
        { originalFilename: { like: search } },
      ],
    } as import('payload').Where)
    if (mediaType) andClauses.push({ mediaType: { equals: mediaType } })

    const result = await payload.find({
      collection: 'media',
      where: { and: andClauses },
      sort: '-captureDate,-createdAt',
      limit: PAGE_SIZE,
      page,
      depth: 0,
    })

    return {
      success: true,
      message: 'OK',
      data: {
        docs: result.docs as import('@/payload-types').Media[],
        hasNextPage: page * PAGE_SIZE < result.totalDocs,
        totalDocs: result.totalDocs,
      },
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed to fetch media' }
  }
}

/** Generate a short-lived preview token for a draft portfolio */
export async function generatePreviewTokenAction(
  portfolioId: number,
): Promise<PortfolioActionResult<{ token: string }>> {
  try {
    const { payload, user } = await getAuth()
    if (!user) return { success: false, message: 'Unauthorized' }

    // Verify caller owns this portfolio (prevents non-owners issuing tokens)
    const portfolio = await payload.findByID({
      collection: 'portfolios',
      id: portfolioId,
      depth: 0,
      user,
    })
    const ownerId = typeof portfolio.owner === 'object'
      ? (portfolio.owner as { id: number }).id
      : portfolio.owner
    const isAdmin = user.roles?.includes('admin')
    if (ownerId !== user.id && !isAdmin) {
      return { success: false, message: 'Forbidden' }
    }

    const { createHmac } = await import('crypto')
    const secret = process.env.PAYLOAD_SECRET
    if (!secret && process.env.NODE_ENV === 'production') {
      return { success: false, message: 'Server configuration error' }
    }
    const signingSecret = secret || 'fallback-secret'
    const expiresAt = Date.now() + 5 * 60 * 1000
    const tokenPayload = `${portfolioId}:${expiresAt}`
    const hmac = createHmac('sha256', signingSecret).update(tokenPayload).digest('hex')
    const token = Buffer.from(`${tokenPayload}:${hmac}`).toString('base64url')

    return { success: true, message: 'OK', data: { token } }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Failed' }
  }
}
