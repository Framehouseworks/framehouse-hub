'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function PortfolioError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Surface runtime errors in structured logs without leaking to the client
    console.error('[portfolio-viewer]', error)
  }, [error])

  return (
    <div className="relative min-h-screen bg-black flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Ambient glow — warm tint to signal error state */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 35% at 50% 55%, rgba(255,127,103,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        <span
          className="mb-8 text-[10px] uppercase tracking-[0.5em]"
          style={{ fontFamily: "'Rubik Mono One', monospace", color: '#ff7f67', opacity: 0.7 }}
        >
          Something went wrong
        </span>

        <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-white/80 mb-4 leading-snug">
          We couldn&apos;t load this gallery
        </h1>

        <p className="text-sm text-white/35 leading-relaxed mb-10">
          A temporary error occurred. Refreshing usually resolves it — if the problem
          persists, contact the gallery owner.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button
            onClick={reset}
            className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-6 rounded-[20px] text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-6 rounded-[20px] text-sm font-medium text-white/50 border border-white/10 hover:text-white hover:border-white/25 transition-colors"
          >
            Go to Framehouse Hub
          </Link>
        </div>
      </div>

      <div
        className="absolute bottom-8 text-[9px] uppercase tracking-[0.45em] text-white/15"
        style={{ fontFamily: "'Rubik Mono One', monospace" }}
      >
        Framehouse Hub
      </div>
    </div>
  )
}
