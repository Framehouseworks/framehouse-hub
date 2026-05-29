import { cn } from '@/utilities/cn'

interface LibraryPageHeaderProps {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

/**
 * Cohesive header used across all Library sub-pages (All Media, Sessions, Collections).
 * Badge style matches the main library page: gold tonal, no icon, consistent typography.
 */
export function LibraryPageHeader({ title, description, action, className }: LibraryPageHeaderProps) {
  return (
    <header className={cn('mb-10 flex flex-col gap-3 flex-shrink-0', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="inline-block bg-gallery-gold/10 text-gallery-gold font-rubik text-[9px] tracking-[0.25em] px-2 py-0.5 rounded-sm uppercase">
            LIBRARY
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-primary lg:text-4xl">
            {title}
          </h1>
          <p className="text-base text-on-surface/40 max-w-xl leading-relaxed">
            {description}
          </p>
        </div>
        {action && <div className="flex-shrink-0 pt-1">{action}</div>}
      </div>
    </header>
  )
}
