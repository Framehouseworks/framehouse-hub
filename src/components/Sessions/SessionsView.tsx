import { auth } from '@/utilities/auth'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { SessionCard, type SessionCardData } from './SessionCard'
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

  const loc = session.location as { address?: string } | null | undefined
  return {
    id: session.id,
    name: session.name,
    shootDate: (session.shootDate as string | null) ?? null,
    description: session.description ?? null,
    location: loc ? { address: loc.address ?? null } : null,
    assetCount,
    thumbnails,
  }
}

// Group sessions by year for timeline structure
function groupByYear(sessions: SessionCardData[]): Map<number | string, SessionCardData[]> {
  const map = new Map<number | string, SessionCardData[]>()
  for (const s of sessions) {
    const key = s.shootDate ? new Date(s.shootDate).getFullYear() : 'Undated'
    const existing = map.get(key) ?? []
    map.set(key, [...existing, s])
  }
  return map
}

export async function SessionsView() {
  const user = await auth()
  if (!user) return null

  const payload = await getPayload({ config: configPromise })

  const { docs: sessions } = await payload.find({
    collection: 'sessions',
    where: { owner: { equals: user.id } },
    sort: '-shootDate,-createdAt',
    limit: 100,
    depth: 0,
  })

  const enriched = await Promise.all(
    sessions.map((s) => enrichSession(s as Session, user.id, payload)),
  )

  if (enriched.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-[20px] bg-[#445aa5]/10 flex items-center justify-center">
          <span className="text-2xl">🎬</span>
        </div>
        <p className="font-inter text-base font-medium text-primary">No sessions yet</p>
        <p className="font-inter text-sm text-on-surface/40 text-center max-w-xs">
          Sessions are created during ingest. Upload media and assign a session name to get started.
        </p>
      </div>
    )
  }

  const grouped = groupByYear(enriched)
  const years = Array.from(grouped.keys()).sort((a, b) => {
    if (a === 'Undated') return 1
    if (b === 'Undated') return -1
    return Number(b) - Number(a)
  })

  return (
    <div className="space-y-10">
      {years.map((year) => (
        <section key={year}>
          {/* Year anchor */}
          <div className="flex items-center gap-3 mb-4">
            <span className="font-rubik text-[11px] font-bold text-[#445aa5] tracking-[0.2em] uppercase">
              {year}
            </span>
            <div className="flex-1 h-[2px] rounded-full bg-gradient-to-r from-[#445aa5]/10 to-transparent" />
            <span className="font-rubik text-[9px] text-on-surface/30">
              {grouped.get(year)!.length} session{grouped.get(year)!.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Session list — horizontal card rows */}
          <div className="flex flex-col gap-2.5">
            {grouped.get(year)!.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
