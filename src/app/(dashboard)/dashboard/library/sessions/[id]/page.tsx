import { notFound } from 'next/navigation'
import { auth } from '@/utilities/auth'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { MediaGrid } from '@/components/Gallery/MediaGrid'
import { Clapperboard, CalendarDays, MapPin, Tag, Images, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Media, Session } from '@/payload-types'

export const dynamic = 'force-dynamic'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await auth()
  if (!user) notFound()

  const payload = await getPayload({ config: configPromise })

  let session: Session
  try {
    session = (await payload.findByID({
      collection: 'sessions',
      id: Number(id),
      depth: 0,
    })) as Session
  } catch {
    notFound()
  }

  const ownerId =
    typeof session.owner === 'object' ? (session.owner as { id: number }).id : session.owner
  if (ownerId !== user.id) notFound()

  const { docs: mediaItems, totalDocs } = await payload.find({
    collection: 'media',
    where: {
      and: [{ owner: { equals: user.id } }, { session: { equals: session.id } }],
    },
    sort: '-captureDate,-createdAt',
    limit: 48,
    depth: 0,
  })

  const loc = session.location as
    | { address?: string; latitude?: number; longitude?: number }
    | null
    | undefined
  const tags = session.defaultTags as { tag?: string }[] | null | undefined
  const tagList = (tags ?? []).map((t) => t.tag).filter(Boolean) as string[]

  // Gather quick stats from media
  const cameras = Array.from(
    new Set(
      (mediaItems as Media[])
        .map((m) => m.technical?.cameraModel)
        .filter(Boolean) as string[],
    ),
  ).slice(0, 3)

  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      {/* Back nav */}
      <Link
        href="/dashboard/library/sessions"
        className="inline-flex items-center gap-1.5 font-rubik text-[10px] font-bold text-[#445aa5]/60 hover:text-[#445aa5] uppercase tracking-[0.18em] mb-6 transition-colors w-fit"
      >
        <ArrowLeft className="h-3 w-3" />
        Sessions
      </Link>

      {/* Production brief header */}
      <header className="mb-8">
        <div className="inline-flex items-center gap-1.5 bg-[#445aa5]/10 text-[#445aa5] font-rubik text-[9px] tracking-[0.25em] px-2.5 py-1 rounded-lg uppercase w-fit mb-4">
          <Clapperboard className="h-3 w-3" />
          Session
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight text-primary lg:text-4xl leading-tight">
              {session.name}
            </h1>
            {session.description && (
              <p className="mt-2 text-sm text-on-surface/50 max-w-2xl leading-relaxed">
                {session.description}
              </p>
            )}

            {/* Meta pills row */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              {session.shootDate && (
                <span className="inline-flex items-center gap-1.5 bg-[#445aa5]/[0.08] text-[#445aa5] rounded-xl px-3 py-1.5">
                  <CalendarDays className="h-3 w-3" />
                  <span className="font-rubik text-[10px] font-bold">
                    {formatDate(session.shootDate as string)}
                  </span>
                </span>
              )}
              {loc?.address && (
                <span className="inline-flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.05] text-on-surface/60 rounded-xl px-3 py-1.5">
                  <MapPin className="h-3 w-3" />
                  <span className="font-rubik text-[10px]">{loc.address}</span>
                </span>
              )}
              {tagList.length > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.05] text-on-surface/60 rounded-xl px-3 py-1.5">
                  <Tag className="h-3 w-3" />
                  <span className="font-rubik text-[10px]">{tagList.join(', ')}</span>
                </span>
              )}
            </div>
          </div>

          {/* Stats sidebar — tonal cards */}
          <div className="flex gap-3 flex-shrink-0">
            <div className="bg-[#445aa5]/[0.07] rounded-[16px] px-5 py-3 text-center min-w-[80px]">
              <div className="flex items-center justify-center mb-1">
                <Images className="h-4 w-4 text-[#445aa5]/60" />
              </div>
              <p className="font-rubik text-2xl font-bold text-[#445aa5] tabular-nums leading-none">
                {totalDocs.toLocaleString()}
              </p>
              <p className="font-rubik text-[8px] text-[#445aa5]/50 uppercase tracking-wider mt-1">
                assets
              </p>
            </div>

            {cameras.length > 0 && (
              <div className="bg-black/[0.03] dark:bg-white/[0.03] rounded-[16px] px-4 py-3 min-w-[80px]">
                <p className="font-rubik text-[8px] text-on-surface/30 uppercase tracking-wider mb-1.5">
                  Cameras
                </p>
                <div className="space-y-0.5">
                  {cameras.map((c) => (
                    <p key={c} className="font-rubik text-[10px] font-bold text-on-surface/60 truncate max-w-[100px]">
                      {c}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Divider — tonal, not a line */}
      <div className="h-px bg-[#445aa5]/[0.08] mb-6" />

      {/* Media grid */}
      {totalDocs === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-14 h-14 rounded-[18px] bg-[#445aa5]/10 flex items-center justify-center">
            <Images className="h-6 w-6 text-[#445aa5]/40" />
          </div>
          <p className="font-inter text-base font-medium text-primary">No media in this session yet</p>
          <p className="font-inter text-sm text-on-surface/40">
            Ingest files and assign them to <strong>{session.name}</strong>.
          </p>
        </div>
      ) : (
        <>
          <p className="font-rubik text-[9px] font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-4">
            All assets — {totalDocs.toLocaleString()}
          </p>
          <MediaGrid
            initialMedia={mediaItems as Media[]}
            collectionContext={undefined}
          />
        </>
      )}
    </div>
  )
}
