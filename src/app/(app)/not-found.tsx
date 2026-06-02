import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center px-6 py-24 text-center">
      {/* Error label */}
      <div
        className="mb-6 text-[9px] uppercase tracking-[0.35em] text-on-surface/25"
        style={{ fontFamily: "'Rubik Mono One', monospace" }}
      >
        Error 404
      </div>

      {/* Headline */}
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-primary mb-4 leading-tight">
        Page not found
      </h1>

      {/* Sub-copy */}
      <p className="text-sm text-on-surface/40 max-w-sm leading-relaxed mb-10">
        The page you&apos;re looking for doesn&apos;t exist, may have moved, or you may not have access.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button asChild size="default" className="rounded-[24px] px-6">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
        <Button asChild variant="ghost" size="default" className="rounded-[24px] px-6">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  )
}
