import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { draftMode } from 'next/headers'

import { getPayloadClient } from '@/utilities/getPayloadClient'
import { RichText } from '@/components/RichText'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{ slug: string }>
}

const CATEGORY_LABELS: Record<string, string> = {
  guide: 'GUIDE',
  workflow: 'WORKFLOW',
  news: 'NEWS',
  tips: 'TIPS',
}

export default async function ArticlePage({ params }: Args) {
  const { slug } = await params
  const { isEnabled: draft } = await draftMode()

  const payload = await getPayloadClient()
  if (!payload) return notFound()

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: 'articles' as any,
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

  const article = result.docs?.[0] as Record<string, unknown> | undefined
  if (!article) return notFound()

  const heroImageRaw = article.heroImage as { url?: string | null; proxyUrl?: string | null } | null | undefined
  const heroSrc = heroImageRaw?.proxyUrl || heroImageRaw?.url || null

  const publishedOn = article.publishedOn as string | null | undefined
  const dateStr = publishedOn
    ? new Date(publishedOn).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const category = article.category as string | null | undefined
  const categoryLabel = CATEGORY_LABELS[category || ''] || category?.toUpperCase()
  const title = article.title as string
  const excerpt = article.excerpt as string | null | undefined
  const readTime = article.readTime as number | null | undefined
  const content = article.content as Parameters<typeof RichText>[0]['data'] | null | undefined

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
            <div className="flex items-center gap-3 mb-6">
              {categoryLabel && (
                <span className="bg-[#ff7f67] text-white font-mono text-[9px] uppercase tracking-[0.3em] px-2.5 py-1 rounded-[8px]">
                  {categoryLabel}
                </span>
              )}
              {readTime && (
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#1a1c1c]/40 dark:text-white/30">
                  {readTime} MIN READ
                </span>
              )}
              {dateStr && (
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#1a1c1c]/40 dark:text-white/30">
                  {dateStr}
                </span>
              )}
            </div>
            <h1 className="font-inter font-bold text-4xl md:text-5xl text-[#1a1c1c] dark:text-white tracking-tight leading-[1.1] mb-6">
              {title}
            </h1>
            {excerpt && (
              <p className="text-lg text-[#1a1c1c]/60 dark:text-white/50 leading-relaxed">
                {excerpt}
              </p>
            )}
          </div>
        </div>
        {heroSrc && (
          <div className="container pb-0">
            <div className="max-w-[900px] h-[400px] md:h-[500px] overflow-hidden rounded-t-[24px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroSrc}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="container py-16 md:py-24">
        <div className="max-w-[720px]">
          {content && (
            <RichText
              data={content}
              enableGutter={false}
              enableProse={true}
            />
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div className="container">
        <div className="max-w-[720px] pt-12 border-t border-[#eeeeee] dark:border-[#252828]">
          <Link
            href="/learn"
            className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#7f5700] dark:text-[#d79922] hover:opacity-70 transition-opacity"
          >
            ← Back to Learn
          </Link>
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayloadClient()
  if (!payload) return {}

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: 'articles' as any,
    limit: 1,
    pagination: false,
    where: {
      and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }],
    },
    depth: 0,
  })

  const article = result.docs?.[0] as Record<string, unknown> | undefined
  if (!article) return {}

  const meta = article.meta as { title?: string; description?: string } | undefined

  return {
    title: meta?.title || `${article.title} | Framehouse Hub`,
    description: meta?.description || (article.excerpt as string) || undefined,
  }
}
