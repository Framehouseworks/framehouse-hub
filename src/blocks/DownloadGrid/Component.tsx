import React from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/cn'
import { getPayloadClient } from '@/utilities/getPayloadClient'
import { cookies } from 'next/headers'

type Download = {
  id: string | number
  title: string
  description?: string | null
  fileType?: string | null
  requiresAccount?: boolean | null
  thumbnail?: { thumbnailUrl?: string | null; url?: string | null } | null
  downloadFile?: { url?: string | null } | null
  externalUrl?: string | null
  tags?: { tag?: string | null }[] | null
}

type DownloadGridBlockProps = {
  id?: string | number
  heading?: string | null
  subheading?: string | null
  downloads?: (Download | string | number)[] | null
  backgroundColor?: 'white' | 'surface_low' | null
}

const FILE_TYPE_LABELS: Record<string, string> = {
  lut: 'LUT',
  template: 'TEMPLATE',
  preset: 'PRESET',
  other: 'DOWNLOAD',
}

async function resolveDownloads(
  downloadsRel: DownloadGridBlockProps['downloads'],
): Promise<Download[]> {
  const payload = await getPayloadClient()
  if (!payload) return []

  const ids = (downloadsRel || [])
    .map((d) => (typeof d === 'object' ? d.id : d))
    .filter(Boolean)

  if (ids.length > 0) {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: 'downloads' as any,
      where: { and: [{ id: { in: ids } }, { _status: { equals: 'published' } }] },
      limit: 9,
      depth: 1,
    })
    return result.docs as unknown as Download[]
  }

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: 'downloads' as any,
    where: { _status: { equals: 'published' } },
    limit: 9,
    depth: 1,
  })
  return result.docs as unknown as Download[]
}

function DownloadCard({ download, isAuthenticated }: { download: Download; isAuthenticated: boolean }) {
  const imgSrc = download.thumbnail?.thumbnailUrl || download.thumbnail?.url
  const typeLabel = FILE_TYPE_LABELS[download.fileType || ''] || 'DOWNLOAD'
  const isGated = download.requiresAccount && !isAuthenticated

  return (
    <div className="group flex flex-col bg-[#f9f9f9] dark:bg-[#1e2020] rounded-[16px] overflow-hidden hover:shadow-[0_20px_40px_rgba(26,28,28,0.08)] transition-shadow duration-700">
      <div className="relative h-[180px] bg-[#eeeeee] dark:bg-[#252828] overflow-hidden">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={download.title}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 scale-105 group-hover:scale-100 transition-all duration-700 ease-[0.23,1,0.32,1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#d79922]/5">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#d79922]/40">
              {typeLabel}
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 bg-[#d79922] text-white font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-1 rounded-[8px]">
          {typeLabel}
        </span>
        {isGated && (
          <div className="absolute inset-0 bg-[#1a1c1c]/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-white text-xl" aria-hidden="true">🔒</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-5 flex-1">
        <h3 className="font-inter font-semibold text-[#1a1c1c] dark:text-white text-base leading-snug">
          {download.title}
        </h3>
        {download.description && (
          <p className="text-sm text-[#1a1c1c]/60 dark:text-white/50 leading-relaxed line-clamp-2">
            {download.description}
          </p>
        )}
        {download.tags && download.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {download.tags.slice(0, 3).map((t, i) =>
              t.tag ? (
                <span
                  key={i}
                  className="font-mono text-[9px] uppercase tracking-[0.2em] bg-[#eeeeee] dark:bg-[#252828] text-[#1a1c1c]/50 dark:text-white/30 px-2 py-0.5 rounded-[6px]"
                >
                  {t.tag}
                </span>
              ) : null,
            )}
          </div>
        )}

        <div className="mt-auto pt-3">
          {isGated ? (
            <Link
              href="/create-account"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#7f5700] dark:text-[#d79922] hover:opacity-70 transition-opacity"
            >
              Create free account to download →
            </Link>
          ) : (
            <a
              href={download.downloadFile?.url || download.externalUrl || '#'}
              download={!!download.downloadFile?.url}
              target={download.externalUrl ? '_blank' : undefined}
              rel={download.externalUrl ? 'noopener noreferrer' : undefined}
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#7f5700] dark:text-[#d79922] hover:opacity-70 transition-opacity"
            >
              Download free →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export const DownloadGridBlock: React.FC<DownloadGridBlockProps> = async (props) => {
  const { id, heading, subheading, downloads: downloadsRel, backgroundColor } = props

  const [downloads, cookieStore] = await Promise.all([
    resolveDownloads(downloadsRel),
    cookies(),
  ])

  // Check for Payload auth cookie (payload-token)
  const isAuthenticated = cookieStore.has('payload-token')

  const bgClass =
    backgroundColor === 'surface_low'
      ? 'bg-[#f3f3f4] dark:bg-[#252828]'
      : 'bg-white dark:bg-[#1a1c1c]'

  return (
    <section id={id ? String(id) : undefined} className={cn('py-24 md:py-32', bgClass)}>
      <div className="container">
        <div className="flex flex-col gap-3 mb-16">
          {heading && (
            <h2 className="font-inter font-bold text-3xl md:text-4xl text-[#1a1c1c] dark:text-white tracking-tight">
              {heading}
            </h2>
          )}
          {subheading && (
            <p className="text-base text-[#1a1c1c]/60 dark:text-white/50 max-w-[480px]">
              {subheading}
            </p>
          )}
          {!isAuthenticated && (
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#bb1800]/70 dark:text-[#ff7f67]/60">
              Free account required — downloads are unlocked on sign up.
            </p>
          )}
        </div>

        {downloads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {downloads.map((download) => (
              <DownloadCard key={download.id} download={download} isAuthenticated={isAuthenticated} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#1a1c1c]/40 dark:text-white/30 font-mono uppercase tracking-[0.3em]">
            No downloads published yet.
          </p>
        )}
      </div>
    </section>
  )
}
