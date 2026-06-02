import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

const TIER_LIMIT_BYTES = Number(process.env.STORAGE_TIER_LIMIT_BYTES) || 2 * 1024 ** 4 // 2 TB

type ByType = { image: number; video: number; audio: number; other: number }

export async function GET(): Promise<NextResponse> {
  const headers = await getHeaders()
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers })

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Issue-1 fix: Media ownership field is 'owner', not 'createdBy'.
  // overrideAccess required because the access control on Media is ownerOrAdmin —
  // without it the find would be scoped to user's own docs anyway, but we need
  // the admin-level query to avoid double-filtering issues in some Payload versions.
  const { docs } = await payload.find({
    collection: 'media',
    where: { owner: { equals: user.id } },
    limit: 10000,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })

  const byType: ByType = { image: 0, video: 0, audio: 0, other: 0 }

  for (const doc of docs) {
    const size: number = (doc as { filesize?: number }).filesize ?? 0
    const mime: string = (doc as { mimeType?: string }).mimeType ?? ''
    if (mime.startsWith('image/')) byType.image += size
    else if (mime.startsWith('video/')) byType.video += size
    else if (mime.startsWith('audio/')) byType.audio += size
    else byType.other += size
  }

  const totalBytes = byType.image + byType.video + byType.audio + byType.other
  const usagePercent = TIER_LIMIT_BYTES > 0 ? (totalBytes / TIER_LIMIT_BYTES) * 100 : 0

  return NextResponse.json({
    totalBytes,
    byType,
    tierLimitBytes: TIER_LIMIT_BYTES,
    usagePercent: Math.min(usagePercent, 100),
  })
}
