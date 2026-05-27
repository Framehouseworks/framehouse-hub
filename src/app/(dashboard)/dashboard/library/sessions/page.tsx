import { Suspense } from 'react'
import { SessionsView } from '@/components/Sessions/SessionsView'
import { Clapperboard } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function SessionsPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-180px)]">
      <header className="mb-10 flex flex-col gap-4 flex-shrink-0">
        <div className="inline-flex items-center gap-1.5 bg-[#445aa5]/10 text-[#445aa5] font-rubik text-[9px] tracking-[0.25em] px-2.5 py-1 rounded-lg uppercase w-fit">
          <Clapperboard className="h-3 w-3" />
          Library
        </div>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-primary lg:text-4xl">
            Sessions
          </h1>
          <p className="mt-2 text-base text-on-surface/40 max-w-xl leading-relaxed">
            How you produced the work — every shoot, location and date, in chronological order.
          </p>
        </div>

        {/* Distinction callout — tonal, no border */}
        <div className="flex flex-col sm:flex-row gap-3 mt-1">
          <div className="flex-1 bg-[#445aa5]/[0.06] rounded-[16px] px-4 py-3 space-y-1">
            <p className="font-rubik text-[9px] font-bold text-[#445aa5] uppercase tracking-[0.2em]">
              Sessions — Production Journal
            </p>
            <p className="font-inter text-[11px] text-on-surface/50 leading-relaxed">
              A session is one shoot: a date, a location, the assets you captured. It answers&nbsp;
              <em>when and where</em> you made the work.
            </p>
          </div>
          <div className="flex-1 bg-gallery-gold/[0.06] rounded-[16px] px-4 py-3 space-y-1">
            <p className="font-rubik text-[9px] font-bold text-gallery-gold uppercase tracking-[0.2em]">
              Collections — Curated Views
            </p>
            <p className="font-inter text-[11px] text-on-surface/50 leading-relaxed">
              Collections group assets thematically — by tag, camera or media type. They answer&nbsp;
              <em>what the work is about</em> and help you share or discover it.
            </p>
          </div>
        </div>
      </header>

      <Suspense
        fallback={
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[96px] rounded-[20px] bg-gallery-surface/50 animate-pulse" />
            ))}
          </div>
        }
      >
        <SessionsView />
      </Suspense>
    </div>
  )
}
