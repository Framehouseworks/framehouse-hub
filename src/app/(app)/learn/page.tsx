import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { draftMode } from 'next/headers'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { getPayloadClient } from '@/utilities/getPayloadClient'

export const dynamic = 'force-dynamic'

async function getCounts() {
  const payload = await getPayloadClient()
  if (!payload) return { tutorials: 0, articles: 0, downloads: 0 }
  const [t, a, d] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload.count({ collection: 'tutorials' as any, where: { _status: { equals: 'published' } } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload.count({ collection: 'articles' as any, where: { _status: { equals: 'published' } } }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload.count({ collection: 'downloads' as any, where: { _status: { equals: 'published' } } }),
  ])
  return { tutorials: t.totalDocs, articles: a.totalDocs, downloads: d.totalDocs }
}

async function getLearnPage() {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayloadClient()
  if (!payload) return null
  const result = await payload.find({
    collection: 'pages',
    draft,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where: {
      and: [
        { slug: { equals: 'learn' } },
        ...(draft ? [] : [{ _status: { equals: 'published' } }]),
      ],
    },
  })
  return result.docs?.[0] || null
}

const NAV_ITEMS = [
  { label: 'Tutorials', href: '#tutorials' },
  { label: 'Articles', href: '#articles' },
  { label: 'Downloads', href: '#downloads' },
]

export default async function LearnPage() {
  const [page, counts] = await Promise.all([getLearnPage(), getCounts()])
  if (!page) return notFound()

  const stats = [
    {
      index: '01',
      label: 'Tutorials',
      value: counts.tutorials,
      description: 'Step-by-step platform guides',
      href: '#tutorials',
      accent: 'text-[#7f5700] dark:text-[#d79922]',
      bg: 'bg-[#d79922]/6 dark:bg-[#d79922]/5 hover:bg-[#d79922]/10 dark:hover:bg-[#d79922]/8',
    },
    {
      index: '02',
      label: 'Articles',
      value: counts.articles,
      description: 'Guides and workflow insights',
      href: '#articles',
      accent: 'text-[#445aa5] dark:text-[#8899d4]',
      bg: 'bg-[#445aa5]/6 dark:bg-[#445aa5]/5 hover:bg-[#445aa5]/10 dark:hover:bg-[#445aa5]/8',
    },
    {
      index: '03',
      label: 'Downloads',
      value: counts.downloads,
      description: 'Free LUTs, templates & presets',
      href: '#downloads',
      accent: 'text-[#bb1800] dark:text-[#ff7f67]',
      bg: 'bg-[#ff7f67]/8 dark:bg-[#ff7f67]/5 hover:bg-[#ff7f67]/12 dark:hover:bg-[#ff7f67]/8',
    },
  ]

  return (
    <div className="pb-24">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-[#f3f3f4] dark:bg-[#1e2020] pt-32 pb-0">
        {/* Decorative background word */}
        <div
          className="absolute inset-0 flex items-center justify-end pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          <span className="font-rubik text-[22vw] font-black uppercase leading-none tracking-tighter text-[#1a1c1c]/[0.03] dark:text-white/[0.025] translate-x-[8%] translate-y-[5%]">
            LEARN
          </span>
        </div>

        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start pb-20 md:pb-28">
            {/* Left: headline */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              {/* Label chip */}
              <span className="inline-flex w-fit items-center font-mono text-[10px] uppercase tracking-[0.4em] text-[#7f5700] dark:text-[#d79922] bg-[#d79922]/10 dark:bg-[#d79922]/8 px-3 py-1.5 rounded-[8px]">
                Framehouse Hub
              </span>

              {/* Headline */}
              <div className="flex flex-col gap-4">
                <h1 className="font-inter font-bold text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.0] tracking-[-0.03em] text-[#1a1c1c] dark:text-white">
                  Your creative
                  <br />
                  <span className="text-[#1a1c1c]/40 dark:text-white/25">learning hub.</span>
                </h1>
                <p className="text-lg text-[#1a1c1c]/60 dark:text-white/50 max-w-[520px] leading-relaxed font-inter">
                  Guides, tutorials, and free resources to help you get more from Framehouse Hub —
                  whether you&apos;re starting out or refining your workflow.
                </p>
              </div>

              {/* Quick-jump nav */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {NAV_ITEMS.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[#1a1c1c]/50 dark:text-white/40 hover:text-[#7f5700] dark:hover:text-[#d79922] transition-colors duration-300"
                  >
                    <span className="w-4 h-px bg-current" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right: stat cards */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              {stats.map((stat) => (
                <Link
                  key={stat.index}
                  href={stat.href}
                  className={`group flex items-center gap-5 px-5 py-4 rounded-[16px] transition-all duration-500 ${stat.bg}`}
                >
                  {/* Index */}
                  <span className="font-mono text-[11px] tracking-[0.3em] text-[#1a1c1c]/25 dark:text-white/20 shrink-0 w-6">
                    {stat.index}
                  </span>

                  {/* Count */}
                  <span
                    className={`font-rubik text-3xl font-black tracking-tight leading-none shrink-0 w-12 ${stat.accent}`}
                  >
                    {stat.value}
                  </span>

                  {/* Text */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-inter font-semibold text-sm text-[#1a1c1c] dark:text-white leading-none">
                      {stat.label}
                    </span>
                    <span className="font-inter text-xs text-[#1a1c1c]/50 dark:text-white/40 leading-snug">
                      {stat.description}
                    </span>
                  </div>

                  {/* Arrow */}
                  <span className="ml-auto font-mono text-[10px] text-[#1a1c1c]/20 dark:text-white/15 group-hover:text-[#1a1c1c]/50 dark:group-hover:text-white/40 group-hover:translate-x-1 transition-all duration-300">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom fade into white */}
        <div className="h-16 bg-gradient-to-b from-transparent to-white dark:to-[#1a1c1c]" />
      </div>

      {/* ── CMS Blocks ── */}
      <RenderBlocks blocks={page.layout} />
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getLearnPage()
  if (!page) return {}
  const meta = (page as { meta?: { title?: string; description?: string } }).meta
  return {
    title: meta?.title || 'Learn | Framehouse Hub',
    description:
      meta?.description ||
      'Tutorials, articles, and free downloads for Framehouse Hub creatives.',
  }
}
