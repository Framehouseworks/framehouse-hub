import Link from 'next/link'

export default function PortfolioNotFound() {
  return (
    <div className="relative min-h-screen bg-black flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(255,255,255,0.03) 0%, transparent 70%)',
        }}
      />

      {/* Background numeral */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        style={{
          fontFamily: "'Rubik Mono One', monospace",
          fontSize: 'clamp(160px, 30vw, 320px)',
          lineHeight: 1,
          color: 'rgba(255,255,255,0.03)',
          letterSpacing: '-0.04em',
        }}
      >
        404
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Error label */}
        <span
          className="mb-8 text-[10px] uppercase tracking-[0.5em] text-white/20"
          style={{ fontFamily: "'Rubik Mono One', monospace" }}
        >
          Error 404
        </span>

        {/* Headline */}
        <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-white/80 mb-4 leading-snug">
          This portfolio isn&apos;t available
        </h1>

        {/* Sub-copy — ambiguous by design (don't reveal whether it exists) */}
        <p className="text-sm text-white/35 leading-relaxed mb-10">
          It may be private, the link may have expired, or it may not exist.
          <br className="hidden sm:block" />
          If you were invited to view this gallery, ask the creator for a new link.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-6 rounded-[20px] text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
          >
            Go to Framehouse Hub
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-6 rounded-[20px] text-sm font-medium text-white/50 border border-white/10 hover:text-white hover:border-white/25 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Footer brand */}
      <div
        className="absolute bottom-8 text-[9px] uppercase tracking-[0.45em] text-white/15"
        style={{ fontFamily: "'Rubik Mono One', monospace" }}
      >
        Framehouse Hub
      </div>
    </div>
  )
}
