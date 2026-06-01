import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { draftMode } from 'next/headers'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { getPayloadClient } from '@/utilities/getPayloadClient'

export const dynamic = 'force-dynamic'

async function getCompanyPage() {
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
        { slug: { equals: 'company' } },
        ...(draft ? [] : [{ _status: { equals: 'published' } }]),
      ],
    },
  })
  return result.docs?.[0] || null
}

const VALUES = [
  {
    index: '01',
    heading: 'Built for creatives',
    body: 'Not adapted from an enterprise tool. Designed from scratch for photographers, videographers, and studios.',
    accent: 'bg-[#d79922]/10 dark:bg-[#d79922]/8',
    label: 'text-[#7f5700] dark:text-[#d79922]',
  },
  {
    index: '02',
    heading: 'Priced for reality',
    body: "Professional-grade tools shouldn't require enterprise budgets. Our pricing scales with your work, not your headcount.",
    accent: 'bg-[#445aa5]/8 dark:bg-[#445aa5]/6',
    label: 'text-[#445aa5] dark:text-[#8899d4]',
  },
  {
    index: '03',
    heading: 'Shaped by feedback',
    body: 'The product is built in public. Every feature reflects a real problem from a real creative. We listen before we ship.',
    accent: 'bg-[#ff7f67]/8 dark:bg-[#ff7f67]/5',
    label: 'text-[#bb1800] dark:text-[#ff7f67]',
  },
]

export default async function CompanyPage() {
  const page = await getCompanyPage()
  if (!page) return notFound()

  return (
    <div className="pb-24 overflow-x-hidden">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-[#f3f3f4] dark:bg-[#1e2020] pt-24 md:pt-32">
        {/* Decorative ghost text — clipped, no horizontal overflow */}
        <div
          className="absolute inset-0 flex items-end justify-start pointer-events-none select-none"
          aria-hidden="true"
        >
          <span className="font-rubik text-[40vw] md:text-[28vw] font-black uppercase leading-none tracking-tighter text-[#1a1c1c]/[0.025] dark:text-white/[0.02] translate-y-[20%]">
            FHW
          </span>
        </div>

        <div className="container relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start pb-16 md:pb-24">

            {/* Left: headline */}
            <div className="lg:col-span-6 flex flex-col gap-6 md:gap-8">
              <span className="inline-flex w-fit items-center font-mono text-[10px] uppercase tracking-[0.4em] text-[#1a1c1c]/40 dark:text-white/30 bg-[#1a1c1c]/5 dark:bg-white/5 px-3 py-1.5 rounded-[8px]">
                Framehouse Works — Est. 2026
              </span>

              <h1 className="font-inter font-bold text-4xl md:text-5xl lg:text-[clamp(2.8rem,4.5vw,4rem)] leading-[1.05] tracking-[-0.03em] text-[#1a1c1c] dark:text-white">
                Building tools
                <br />
                <span className="text-[#1a1c1c]/35 dark:text-white/25">
                  for creative professionals.
                </span>
              </h1>

              <p className="text-base text-[#1a1c1c]/60 dark:text-white/50 leading-relaxed font-inter">
                We make professional-grade digital asset management accessible to independent
                creatives and small studios — without enterprise pricing or enterprise complexity.
              </p>

              <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <Link
                  href="/hub"
                  className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-[#7f5700] dark:text-[#d79922] hover:opacity-70 transition-opacity"
                >
                  Explore the platform →
                </Link>
                <Link
                  href="/pricing"
                  className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#1a1c1c]/40 dark:text-white/30 hover:text-[#1a1c1c] dark:hover:text-white transition-colors"
                >
                  See pricing
                </Link>
              </div>
            </div>

            {/* Right: value cards — no images, fully CSS */}
            <div className="lg:col-span-6 flex flex-col gap-3 lg:pt-4">
              {VALUES.map((v) => (
                <div
                  key={v.index}
                  className={`flex items-start gap-4 px-4 py-4 md:px-5 md:py-5 rounded-[16px] ${v.accent}`}
                >
                  <span className={`font-mono text-[10px] tracking-[0.3em] shrink-0 pt-0.5 ${v.label}`}>
                    {v.index}
                  </span>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <p className="font-inter font-semibold text-sm text-[#1a1c1c] dark:text-white leading-snug">
                      {v.heading}
                    </p>
                    <p className="font-inter text-sm text-[#1a1c1c]/55 dark:text-white/45 leading-relaxed">
                      {v.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="h-12 md:h-16 bg-gradient-to-b from-transparent to-white dark:to-[#1a1c1c]" />
      </div>

      {/* ── CMS blocks (WHO WE ARE / OUR BELIEF / HOW WE WORK / mission) ── */}
      <RenderBlocks blocks={page.layout} />

      {/* ── Closing CTA ── */}
      <section className="bg-[#f3f3f4] dark:bg-[#252828] py-16 md:py-24">
        <div className="container">
          <div className="flex flex-col gap-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#1a1c1c]/40 dark:text-white/30">
              Join us
            </p>
            <h2 className="font-inter font-bold text-2xl md:text-4xl text-[#1a1c1c] dark:text-white tracking-tight leading-tight">
              Start building your archive today.
            </h2>
            <p className="text-base text-[#1a1c1c]/60 dark:text-white/50 leading-relaxed">
              Free to get started. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
              <Link
                href="/create-account"
                className="inline-flex items-center justify-center h-11 px-8 rounded-[24px] bg-[#d79922] text-white font-mono text-[10px] uppercase tracking-[0.3em] hover:bg-[#7f5700] transition-colors duration-300"
              >
                Create free account
              </Link>
              <Link
                href="/learn"
                className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#1a1c1c]/40 dark:text-white/30 hover:text-[#1a1c1c] dark:hover:text-white transition-colors"
              >
                Browse learning resources →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getCompanyPage()
  if (!page) return {}
  const meta = (page as { meta?: { title?: string; description?: string } }).meta
  return {
    title: meta?.title || 'Company | Framehouse Works',
    description:
      meta?.description ||
      'Framehouse Works builds professional-grade digital asset management for creative professionals.',
  }
}
