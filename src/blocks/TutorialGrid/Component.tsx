import React from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/cn'
import { getPayloadClient } from '@/utilities/getPayloadClient'

type Tutorial = {
  id: string | number
  title: string
  slug: string
  description?: string | null
  category?: string | null
  difficulty?: string | null
  duration?: string | null
  order?: number | null
  steps?: unknown[] | null
  heroImage?: { thumbnailUrl?: string | null; url?: string | null } | null
}

type TutorialGridBlockProps = {
  id?: string | number
  heading?: string | null
  subheading?: string | null
  tutorials?: (Tutorial | string | number)[] | null
  backgroundColor?: 'white' | 'surface_low' | null
}

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-[#d79922]/15 text-[#7f5700] dark:bg-[#d79922]/10 dark:text-[#d79922]',
  intermediate: 'bg-[#445aa5]/15 text-[#445aa5] dark:bg-[#445aa5]/10 dark:text-[#8899d4]',
  advanced: 'bg-[#ff7f67]/20 text-[#bb1800] dark:bg-[#ff7f67]/10 dark:text-[#ff7f67]',
}

const CATEGORY_ORDER: Record<string, number> = {
  'getting-started': 0,
  organise: 1,
  publish: 2,
  advanced: 3,
}

async function resolveTutorials(
  tutorialsRel: TutorialGridBlockProps['tutorials'],
): Promise<Tutorial[]> {
  const payload = await getPayloadClient()
  if (!payload) return []

  const ids = (tutorialsRel || [])
    .map((t) => (typeof t === 'object' ? t.id : t))
    .filter(Boolean)

  if (ids.length > 0) {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: 'tutorials' as any,
      where: { and: [{ id: { in: ids } }, { _status: { equals: 'published' } }] },
      sort: 'order',
      limit: 12,
      depth: 1,
    })
    return result.docs as unknown as Tutorial[]
  }

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: 'tutorials' as any,
    where: { _status: { equals: 'published' } },
    sort: 'order',
    limit: 12,
    depth: 1,
  })
  return result.docs as unknown as Tutorial[]
}

function TutorialCard({ tutorial, index }: { tutorial: Tutorial; index: number }) {
  const imgSrc = tutorial.heroImage?.thumbnailUrl || tutorial.heroImage?.url
  const stepCount = Array.isArray(tutorial.steps) ? tutorial.steps.length : 0
  const difficultyStyle = DIFFICULTY_STYLES[tutorial.difficulty || 'beginner']
  const indexStr = (index + 1).toString().padStart(2, '0')

  return (
    <Link
      href={`/learn/tutorials/${tutorial.slug}`}
      className="group flex flex-col bg-[#f9f9f9] dark:bg-[#1e2020] rounded-[16px] overflow-hidden hover:shadow-[0_20px_40px_rgba(26,28,28,0.08)] transition-all duration-700"
    >
      <div className="relative h-[180px] bg-[#eeeeee] dark:bg-[#252828] overflow-hidden">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={tutorial.title}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 scale-105 group-hover:scale-100 transition-all duration-700 ease-[0.23,1,0.32,1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#1a1c1c]/20 dark:text-white/10">
              Tutorial
            </span>
          </div>
        )}
        <span className="absolute top-3 left-3 font-mono text-[10px] tracking-[0.3em] text-white/60 bg-black/30 px-2 py-1 rounded-[8px] backdrop-blur-sm">
          {indexStr}
        </span>
      </div>

      <div className="flex flex-col gap-3 p-5 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {tutorial.difficulty && (
            <span
              className={cn(
                'font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-[6px]',
                difficultyStyle,
              )}
            >
              {tutorial.difficulty}
            </span>
          )}
          {tutorial.duration && (
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#1a1c1c]/30 dark:text-white/20">
              {tutorial.duration}
            </span>
          )}
        </div>

        <h3 className="font-inter font-semibold text-[#1a1c1c] dark:text-white text-base leading-snug group-hover:text-[#7f5700] dark:group-hover:text-[#d79922] transition-colors duration-300">
          {tutorial.title}
        </h3>

        {tutorial.description && (
          <p className="text-sm text-[#1a1c1c]/60 dark:text-white/50 leading-relaxed line-clamp-2">
            {tutorial.description}
          </p>
        )}

        {stepCount > 0 && (
          <div className="mt-auto pt-3 flex items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#1a1c1c]/30 dark:text-white/20">
              {stepCount} {stepCount === 1 ? 'STEP' : 'STEPS'}
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}

export const TutorialGridBlock: React.FC<TutorialGridBlockProps> = async (props) => {
  const { id, heading, subheading, tutorials: tutorialsRel, backgroundColor } = props

  const tutorials = await resolveTutorials(tutorialsRel)

  // Group by category for display order
  const sorted = [...tutorials].sort(
    (a, b) =>
      (CATEGORY_ORDER[a.category || ''] ?? 99) - (CATEGORY_ORDER[b.category || ''] ?? 99) ||
      (a.order ?? 0) - (b.order ?? 0),
  )

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
        </div>

        {sorted.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((tutorial, i) => (
              <TutorialCard key={tutorial.id} tutorial={tutorial} index={i} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#1a1c1c]/40 dark:text-white/30 font-mono uppercase tracking-[0.3em]">
            No tutorials published yet.
          </p>
        )}
      </div>
    </section>
  )
}
