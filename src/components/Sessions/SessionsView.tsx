import { auth } from '@/utilities/auth'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type { SessionCardData } from './SessionCard'
import { SessionsClient } from './SessionsClient'
import type { Session } from '@/payload-types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enrichSession(session: Session, userId: number | string, payload: any): Promise<SessionCardData> {
  let assetCount = 0
  let thumbnails: string[] = []

  try {
    const { totalDocs } = await payload.find({
      collection: 'media',
      where: { and: [{ owner: { equals: userId } }, { session: { equals: session.id } }] },
      limit: 0,
      depth: 0,
    })
    assetCount = totalDocs

    if (assetCount > 0) {
      const { docs } = await payload.find({
        collection: 'media',
        where: { and: [{ owner: { equals: userId } }, { session: { equals: session.id } }] },
        limit: 4,
        sort: '-captureDate,-createdAt',
        depth: 0,
        select: { thumbnailUrl: true, proxyUrl: true, originalUrl: true, url: true },
      })
      thumbnails = docs
        .map(
          (m: { thumbnailUrl?: string; proxyUrl?: string; originalUrl?: string; url?: string }) =>
            m.thumbnailUrl || m.proxyUrl || m.originalUrl || m.url,
        )
        .filter(Boolean) as string[]
    }
  } catch {
    /* non-fatal */
  }

  const loc = session.location as {
    address?: string
    latitude?: number
    longitude?: number
  } | null | undefined
  const defaultTags = (session.defaultTags as { tag?: string }[] | null | undefined) ?? []

  return {
    id: session.id,
    name: session.name,
    shootDate: (session.shootDate as string | null) ?? null,
    description: session.description ?? null,
    location: loc ? { address: loc.address ?? null } : null,
    locationFull: loc
      ? { address: loc.address ?? null, latitude: loc.latitude ?? null, longitude: loc.longitude ?? null }
      : null,
    defaultTags: defaultTags.map((t) => t.tag).filter(Boolean) as string[],
    assetCount,
    thumbnails,
  }
}

export async function SessionsView() {
  const user = await auth()
  if (!user) return null

  const payload = await getPayload({ config: configPromise })

  const { docs: sessions } = await payload.find({
    collection: 'sessions',
    where: { owner: { equals: user.id } },
    sort: '-shootDate,-createdAt',
    limit: 200,
    depth: 0,
  })

  const enriched = await Promise.all(
    sessions.map((s) => enrichSession(s as Session, user.id, payload)),
  )

  return <SessionsClient initialSessions={enriched} />
}
