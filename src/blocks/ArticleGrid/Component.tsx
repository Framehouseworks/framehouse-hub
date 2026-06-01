import React from 'react'
import Link from 'next/link'
import { cn } from '@/utilities/cn'
import { getPayloadClient } from '@/utilities/getPayloadClient'

type Article = {
  id: string | number
  title: string
  slug: string
  excerpt?: string | null
  category?: string | null
  readTime?: number | null
  publishedOn?: string | null
  heroImage?: { thumbnailUrl?: string | null; url?: string | null } | null
}

type ArticleGridBlockProps = {
  id?: string | number
  heading?: string | null
  subheading?: string | null
  articles?: (Article | string | number)[] | null
  viewAllLabel?: string | null
  backgroundColor?: 'white' | 'surface_low' | null
}

const CATEGORY_LABELS: Record<string, string> = {
  guide: 'GUIDE',
  workflow: 'WORKFLOW',
  news: 'NEWS',
  tips: 'TIPS',
}

async function resolveArticles(
  articlesRel: ArticleGridBlockProps['articles'],
): Promise<Article[]> {
  const payload = await getPayloadClient()
  if (!payload) return []

  const ids = (articlesRel || [])
    .map((a) => (typeof a === 'object' ? a.id : a))
    .filter(Boolean)

  if (ids.length > 0) {
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: 'articles' as any,
      where: { and: [{ id: { in: ids } }, { _status: { equals: 'published' } }] },
      limit: 6,
      depth: 1,
    })
    return result.docs as unknown as Article[]
  }

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: 'articles' as any,
    where: { _status: { equals: 'published' } },
    sort: '-publishedOn',
    limit: 6,
    depth: 1,
  })
  return result.docs as unknown as Article[]
}

function ArticleCard({ article }: { article: Article }) {
  const imgSrc = article.heroImage?.thumbnailUrl || article.heroImage?.url
  const categoryLabel = CATEGORY_LABELS[article.category || ''] || article.category?.toUpperCase()
  const dateStr = article.publishedOn
    ? new Date(article.publishedOn).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  return (
    <Link
      href={`/learn/articles/${article.slug}`}
      className="group flex flex-col bg-[#f9f9f9] dark:bg-[#1e2020] rounded-[16px] overflow-hidden hover:shadow-[0_20px_40px_rgba(26,28,28,0.08)] transition-shadow duration-700"
    >
      <div className="relative h-[200px] bg-[#eeeeee] dark:bg-[#252828] overflow-hidden">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={article.title}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 scale-105 group-hover:scale-100 transition-all duration-700 ease-[0.23,1,0.32,1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#1a1c1c]/20 dark:text-white/10">
              Framehouse
            </span>
          </div>
        )}
        {categoryLabel && (
          <span className="absolute top-3 left-3 bg-[#ff7f67] text-white font-mono text-[9px] uppercase tracking-[0.3em] px-2 py-1 rounded-[8px]">
            {categoryLabel}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 p-6 flex-1">
        <h3 className="font-inter font-semibold text-[#1a1c1c] dark:text-white text-base leading-snug group-hover:text-[#7f5700] dark:group-hover:text-[#d79922] transition-colors duration-300">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-sm text-[#1a1c1c]/60 dark:text-white/50 leading-relaxed line-clamp-3">
            {article.excerpt}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          {dateStr && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1a1c1c]/30 dark:text-white/20">
              {dateStr}
            </span>
          )}
          {article.readTime && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#1a1c1c]/30 dark:text-white/20">
              {article.readTime} MIN READ
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export const ArticleGridBlock: React.FC<ArticleGridBlockProps> = async (props) => {
  const { id, heading, subheading, articles: articlesRel, viewAllLabel, backgroundColor } = props

  const articles = await resolveArticles(articlesRel)

  const bgClass =
    backgroundColor === 'surface_low'
      ? 'bg-[#f3f3f4] dark:bg-[#252828]'
      : 'bg-white dark:bg-[#1a1c1c]'

  return (
    <section id={id ? String(id) : undefined} className={cn('py-24 md:py-32', bgClass)}>
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div className="flex flex-col gap-3">
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
          {viewAllLabel && (
            <Link
              href="/learn/articles"
              className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#7f5700] dark:text-[#d79922] hover:opacity-70 transition-opacity whitespace-nowrap"
            >
              {viewAllLabel} →
            </Link>
          )}
        </div>

        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#1a1c1c]/40 dark:text-white/30 font-mono uppercase tracking-[0.3em]">
            No articles published yet.
          </p>
        )}
      </div>
    </section>
  )
}
