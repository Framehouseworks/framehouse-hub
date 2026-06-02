import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { resolveSession, slugifyZipName } from '@/lib/review-session'
import archiver from 'archiver'
import { PassThrough } from 'stream'
import { Readable } from 'stream'
import type { Media, Portfolio } from '@/payload-types'

type Params = { params: Promise<{ slug: string }> }

const MAX_FILES_PER_DOWNLOAD = 50
const MAX_DOWNLOADS_PER_SESSION = 3
const DOWNLOAD_WINDOW_HOURS = 24
const MAX_BYTES_ORIGINAL = 500 * 1024 * 1024  // 500MB cap for original quality

/** POST /api/portfolio-review/[slug]/download
 *  Streams a zip archive of selected media items for the client. */
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const payload = await getPayload({ config: configPromise })

  const { docs } = await payload.find({
    collection: 'portfolios',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
  })

  const portfolio = docs[0] as Portfolio | undefined
  if (!portfolio) {
    return NextResponse.json({ error: 'PORTFOLIO_NOT_FOUND' }, { status: 404 })
  }

  // EC-02: re-validate portfolio is still accessible
  if (portfolio.visibility === 'private') {
    return NextResponse.json({ error: 'PORTFOLIO_UNAVAILABLE' }, { status: 410 })
  }

  const settings = portfolio.clientReviewSettings
  if (!settings?.allowDownload) {
    return NextResponse.json({ error: 'DOWNLOAD_NOT_PERMITTED' }, { status: 403 })
  }

  const session = await resolveSession(req, portfolio.id)
  if (!session) {
    return NextResponse.json({ error: 'SESSION_NOT_FOUND' }, { status: 401 })
  }

  // Block original quality downloads on public portfolios (EC-20)
  const quality = settings.downloadQuality ?? 'proxy'
  if (quality === 'original' && portfolio.visibility === 'public') {
    return NextResponse.json({ error: 'DOWNLOAD_NOT_PERMITTED' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const requestedIds: number[] = Array.isArray(body?.selections)
    ? body.selections.filter((s: unknown) => typeof s === 'number')
    : []

  if (requestedIds.length === 0) {
    return NextResponse.json({ error: 'SELECTION_EMPTY' }, { status: 422 })
  }

  if (requestedIds.length > MAX_FILES_PER_DOWNLOAD) {
    return NextResponse.json({ error: 'SELECTION_TOO_LARGE', max: MAX_FILES_PER_DOWNLOAD }, { status: 422 })
  }

  // Rate limit: max 3 downloads per session per 24h
  const windowStart = new Date(Date.now() - DOWNLOAD_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { totalDocs: recentDownloads } = await payload.find({
    collection: 'portfolio-download-logs',
    where: {
      and: [
        { clientSession: { equals: session.id } },
        { downloadedAt: { greater_than: windowStart } },
      ],
    },
    limit: 0,
    overrideAccess: true,
  })

  if (recentDownloads >= MAX_DOWNLOADS_PER_SESSION) {
    return NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED' }, { status: 429 })
  }

  // Build valid mediaId map from portfolio
  const portfolioMediaMap = new Map<number, { media: Media; instanceTitle?: string | null }>()
  for (const block of portfolio.layoutBlocks ?? []) {
    if (block.blockType !== 'grid') continue
    for (const item of block.items ?? []) {
      if (item.media && typeof item.media === 'object') {
        const m = item.media as Media
        portfolioMediaMap.set(m.id, {
          media: m,
          instanceTitle: (item as Record<string, unknown>).instanceTitle as string | null,
        })
      }
    }
  }

  const validIds = requestedIds.filter((id) => portfolioMediaMap.has(id))
  if (validIds.length === 0) {
    return NextResponse.json({ error: 'ALL_FILES_UNAVAILABLE' }, { status: 422 })
  }

  const unavailableIds = requestedIds.filter((id) => !portfolioMediaMap.has(id))

  // EC-20: enforce 500MB size cap for original quality
  if (quality === 'original') {
    const totalBytes = validIds.reduce((sum, id) => {
      const entry = portfolioMediaMap.get(id)
      return sum + ((entry?.media.filesize ?? 0) as number)
    }, 0)
    if (totalBytes > MAX_BYTES_ORIGINAL) {
      const estimatedMB = Math.round(totalBytes / (1024 * 1024))
      return NextResponse.json({ error: 'DOWNLOAD_TOO_LARGE', estimatedMB }, { status: 422 })
    }
  }

  // Resolve file URLs and fetch into buffers
  const fileResults = await Promise.all(
    validIds.map(async (id) => {
      const entry = portfolioMediaMap.get(id)!
      const { media } = entry
      const url =
        quality === 'original'
          ? (media.originalUrl ?? media.proxyUrl ?? media.url ?? null)
          : (media.proxyUrl ?? media.thumbnailUrl ?? media.originalUrl ?? media.url ?? null)

      if (!url) return null

      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
        if (!res.ok) return null
        const buffer = Buffer.from(await res.arrayBuffer())
        const ext = quality === 'original'
          ? (media.filename?.split('.').pop() ?? 'jpg')
          : 'webp'
        const safeName = slugifyZipName(
          entry.instanceTitle || media.title || media.filename || `asset-${id}`,
        )
        return { buffer, filename: `${safeName}.${ext}`, mediaId: id }
      } catch {
        return null
      }
    }),
  )

  const successFiles = fileResults.filter((f): f is NonNullable<typeof f> => f !== null)

  if (successFiles.length === 0) {
    return NextResponse.json({ error: 'ALL_FILES_UNAVAILABLE' }, { status: 422 })
  }

  const portfolioNameSlug = slugifyZipName(portfolio.name)
  const dateStr = new Date().toISOString().split('T')[0]
  const zipFilename = `${portfolioNameSlug}_${dateStr}_${successFiles.length}_assets.zip`

  // Build zip archive
  const passThrough = new PassThrough()
  const archive = archiver('zip', { zlib: { level: 5 } })
  archive.pipe(passThrough)

  // Add all files
  for (const file of successFiles) {
    archive.append(file.buffer, { name: file.filename })
  }

  // Add manifest if some files were unavailable
  if (unavailableIds.length > 0 || successFiles.length < validIds.length) {
    const manifestLines = [
      `Framehouse Hub — Download Manifest`,
      `Portfolio: ${portfolio.name}`,
      `Downloaded: ${new Date().toUTCString()}`,
      `Quality: ${quality === 'original' ? 'Full Resolution' : 'Preview Quality'}`,
      ``,
      `Delivered (${successFiles.length}):`,
      ...successFiles.map((f) => `  ✓ ${f.filename}`),
    ]
    if (unavailableIds.length > 0) {
      manifestLines.push(``, `Unavailable (${unavailableIds.length}):`)
      unavailableIds.forEach((id) => manifestLines.push(`  ✗ Asset ID ${id} — no longer in portfolio`))
    }
    archive.append(manifestLines.join('\n'), { name: '_manifest.txt' })
  }

  archive.finalize()

  // Log the download (fire-and-forget)
  payload.create({
    collection: 'portfolio-download-logs',
    data: {
      portfolio: portfolio.id,
      clientSession: session.id,
      clientName: session.clientName || 'Anonymous',
      downloadedItems: validIds.map((id) => ({ media: id })),
      itemCount: successFiles.length,
      quality,
      zipFilename,
      downloadedAt: new Date().toISOString(),
      ipAddress: req.headers.get('x-forwarded-for') ?? 'unknown',
    },
    overrideAccess: true,
  }).catch(() => {})

  const webStream = Readable.toWeb(passThrough) as ReadableStream

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipFilename}"`,
      'X-Files-Included': String(successFiles.length),
      'X-Files-Unavailable': String(unavailableIds.length),
    },
  })
}
