import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { draftMode } from 'next/headers'
import { cn } from '@/utilities/cn'

import { getPayloadClient } from '@/utilities/getPayloadClient'
import { RichText } from '@/components/RichText'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{ slug: string }>
}

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'bg-[#d79922]/15 text-[#7f5700] dark:text-[#d79922]',
  intermediate: 'bg-[#445aa5]/15 text-[#445aa5] dark:text-[#8899d4]',
  advanced: 'bg-[#ff7f67]/20 text-[#bb1800] dark:text-[#ff7f67]',
}

export default async function TutorialPage({ params }: Args) {
  const { slug } = await params
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayloadClient()
  if (!payload) return notFound()

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: 'tutorials' as any,
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      and: [
        { slug: { equals: slug } },
        ...(draft ? [] : [{ _status: { equals: 'published' } }]),
      ],
    },
    depth: 2,
  })

  const tutorial = result.docs?.[0] as Record<string, unknown> | undefined
  if (!tutorial) return notFound()

  const heroImageRaw = tutorial.heroImage as { proxyUrl?: string | null; url?: string | null } | null | undefined
  const heroSrc = heroImageRaw?.proxyUrl || heroImageRaw?.url || null

  type TutorialStep = {
    id?: string
    stepTitle: string
    stepContent?: Record<string, unknown> | null
    stepImage?: { url?: string | null; thumbnailUrl?: string | null } | null
  }

  const steps = (tutorial.steps || []) as TutorialStep[]
  const difficulty = tutorial.difficulty as string | null | undefined
  const difficultyStyle = DIFFICULTY_STYLES[difficulty || 'beginner']
  const tutorialTitle = tutorial.title as string
  const tutorialDescription = tutorial.description as string | null | undefined
  const tutorialDuration = tutorial.duration as string | null | undefined

  return (
    <article className="pt-16 pb-24">
      {/* Hero */}
      <div className="bg-[#f3f3f4] dark:bg-[#252828]">
        <div className="container py-16 md:py-24">
          <div className="max-w-[720px]">
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[#1a1c1c]/40 dark:text-white/30 hover:text-[#7f5700] dark:hover:text-[#d79922] transition-colors mb-8"
            >
              ← Learn
            </Link>
            <div className="flex items-center flex-wrap gap-3 mb-6">
              {difficulty && (
                <span
                  className={cn(
                    'font-mono text-[9px] uppercase tracking-[0.3em] px-2.5 py-1 rounded-[8px]',
                    difficultyStyle,
                  )}
                >
                  {difficulty}
                </span>
              )}
              {tutorialDuration && (
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#1a1c1c]/40 dark:text-white/30">
                  {tutorialDuration}
                </span>
              )}
              {steps.length > 0 && (
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#1a1c1c]/40 dark:text-white/30">
                  {steps.length} {steps.length === 1 ? 'STEP' : 'STEPS'}
                </span>
              )}
            </div>
            <h1 className="font-inter font-bold text-4xl md:text-5xl text-[#1a1c1c] dark:text-white tracking-tight leading-[1.1] mb-6">
              {tutorialTitle}
            </h1>
            {tutorialDescription && (
              <p className="text-lg text-[#1a1c1c]/60 dark:text-white/50 leading-relaxed">
                {tutorialDescription}
              </p>
            )}
          </div>
        </div>
        {heroSrc && (
          <div className="container pb-0">
            <div className="max-w-[900px] h-[360px] md:h-[440px] overflow-hidden rounded-t-[24px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroSrc}
                alt={tutorialTitle}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="container py-16 md:py-24">
          <div className="max-w-[720px]">
            <div className="flex flex-col gap-16">
              {steps.map((step, i) => {
                const stepImgSrc = step.stepImage?.thumbnailUrl || step.stepImage?.url
                const indexStr = (i + 1).toString().padStart(2, '0')
                return (
                  <div key={step.id || i} className="flex flex-col gap-6">
                    <div className="flex items-baseline gap-4">
                      <span className="font-mono text-[#d79922]/50 dark:text-[#d79922]/40 text-lg tracking-[0.3em] shrink-0">
                        {indexStr}
                      </span>
                      <h2 className="font-inter font-bold text-2xl md:text-3xl text-[#1a1c1c] dark:text-white tracking-tight">
                        {step.stepTitle}
                      </h2>
                    </div>

                    {stepImgSrc && (
                      <div className="overflow-hidden rounded-[16px] border border-black/5 dark:border-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={stepImgSrc}
                          alt={step.stepTitle}
                          className="w-full h-auto max-h-[400px] object-cover"
                        />
                      </div>
                    )}

                    {step.stepContent && (
                      <div className="prose prose-neutral dark:prose-invert max-w-none">
                        <RichText
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          data={step.stepContent as any}
                          enableGutter={false}
                          enableProse={true}
                        />
                      </div>
                    )}

                    {i < steps.length - 1 && (
                      <div className="mt-4 h-px bg-[#eeeeee] dark:bg-[#252828]" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Completion callout */}
            <div className="mt-20 p-8 bg-[#d79922]/8 dark:bg-[#d79922]/5 rounded-[16px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#7f5700] dark:text-[#d79922] mb-2">
                Tutorial Complete
              </p>
              <p className="text-base text-[#1a1c1c]/70 dark:text-white/60 font-inter">
                You&apos;ve completed{' '}
                <span className="font-semibold text-[#1a1c1c] dark:text-white">
                  {tutorialTitle}
                </span>
                . Explore more tutorials or start using what you&apos;ve learned in your library.
              </p>
              <div className="flex items-center gap-6 mt-6">
                <Link
                  href="/learn"
                  className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#7f5700] dark:text-[#d79922] hover:opacity-70 transition-opacity"
                >
                  ← More tutorials
                </Link>
                <Link
                  href="/login"
                  className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#1a1c1c]/50 dark:text-white/40 hover:text-[#1a1c1c] dark:hover:text-white transition-colors"
                >
                  Go to Library →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayloadClient()
  if (!payload) return {}

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: 'tutorials' as any,
    limit: 1,
    pagination: false,
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    depth: 0,
  })

  const tutorial = result.docs?.[0] as Record<string, unknown> | undefined
  if (!tutorial) return {}

  const meta = tutorial.meta as { title?: string; description?: string } | undefined

  return {
    title: meta?.title || `${tutorial.title} | Framehouse Hub`,
    description: meta?.description || (tutorial.description as string) || undefined,
  }
}
