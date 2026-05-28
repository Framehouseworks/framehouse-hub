import Link from 'next/link'
import { MapPin, Images } from 'lucide-react'

export interface SessionCardData {
  id: number
  name: string
  shootDate?: string | null
  description?: string | null
  location?: { address?: string | null } | null
  assetCount: number
  thumbnails: string[]
}

function parseDate(iso: string) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('en-GB', { day: 'numeric' }),
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    year: d.getFullYear(),
    full: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  }
}

export function SessionCard({ session }: { session: SessionCardData }) {
  const date = session.shootDate ? parseDate(session.shootDate) : null
  const [t1, t2, t3, t4] = session.thumbnails
  const hasQuad = session.thumbnails.length >= 4

  return (
    <Link
      href={`/dashboard/library/sessions/${session.id}`}
      className="group flex gap-0 rounded-[20px] overflow-hidden bg-white dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.05] shadow-[0_2px_16px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] transition-all duration-300"
    >
      {/* Date column — production calendar accent */}
      <div className="flex-shrink-0 w-[56px] bg-[#445aa5] flex flex-col items-center justify-center py-4 gap-0.5">
        {date ? (
          <>
            <span className="font-rubik text-[9px] font-bold text-white/60 uppercase tracking-widest">
              {date.month}
            </span>
            <span className="font-inter text-2xl font-bold text-white leading-none">
              {date.day}
            </span>
            <span className="font-rubik text-[9px] text-white/40 tabular-nums mt-0.5">
              {date.year}
            </span>
          </>
        ) : (
          <span className="font-rubik text-[9px] text-white/40 uppercase tracking-widest">
            No date
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 min-w-0 gap-3 p-3 sm:p-4 pr-4 items-center">
        {/* Thumbnail strip */}
        <div className="flex-shrink-0 w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-[14px] overflow-hidden bg-black/[0.04] dark:bg-white/[0.04]">
          {hasQuad ? (
            <div className="grid grid-cols-2 grid-rows-2 h-full gap-px">
              {[t1, t2, t3, t4].map((src, i) => (
                <div key={i} className="relative overflow-hidden bg-black/[0.06]">
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
              ))}
            </div>
          ) : session.thumbnails.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={t1}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Images className="text-on-surface/10" size={22} />
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="font-inter text-sm font-semibold text-primary leading-snug line-clamp-1 group-hover:text-[#445aa5] transition-colors">
            {session.name}
          </h3>

          {session.location?.address && (
            <p className="inline-flex items-center gap-1 font-rubik text-[10px] text-on-surface/40 truncate max-w-full">
              <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
              {session.location.address}
            </p>
          )}

          {session.description && (
            <p className="font-inter text-[11px] text-on-surface/40 line-clamp-1 leading-relaxed">
              {session.description}
            </p>
          )}
        </div>

        {/* Asset count */}
        <div className="flex-shrink-0 text-right">
          <span className="font-rubik text-lg font-bold text-on-surface/70 tabular-nums leading-none">
            {session.assetCount.toLocaleString()}
          </span>
          <p className="font-rubik text-[8px] text-on-surface/30 uppercase tracking-wider">
            assets
          </p>
        </div>
      </div>
    </Link>
  )
}
