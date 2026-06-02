'use client'

import { cn } from '@/utilities/cn'
import React, { useEffect, useRef, useState } from 'react'

export interface SectionNavItem {
  anchor: string
  name: string
}

interface SectionNavigatorProps {
  sections: SectionNavItem[]
}

const MAX_LABEL_LEN = 20

function truncate(s: string) {
  return s.length > MAX_LABEL_LEN ? s.slice(0, MAX_LABEL_LEN - 1) + '…' : s
}

/**
 * Sticky section TOC.
 *
 * ≥ 1024px  — vertical pill anchored to right edge, fades in after 300px scroll
 * 768–1023px — floating indicator bottom-right, tapping opens a bottom sheet
 * < 768px   — hidden (scroll-only navigation on mobile)
 *
 * Requires ≥ 2 named sections to render.
 */
export function SectionNavigator({ sections }: SectionNavigatorProps) {
  const [activeAnchor, setActiveAnchor] = useState<string>(sections[0]?.anchor ?? '')
  const [visible, setVisible] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Show navigator once user scrolls past 300px
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (sections.length === 0) return

    const observers: IntersectionObserver[] = []
    const ratio: Record<string, number> = {}

    sections.forEach(({ anchor }) => {
      const el = document.getElementById(anchor)
      if (!el) return

      const obs = new IntersectionObserver(
        ([entry]) => {
          ratio[anchor] = entry.intersectionRatio
          // Active = highest intersection ratio among all sections
          const best = Object.entries(ratio).reduce(
            (a, b) => (b[1] > a[1] ? b : a),
            ['', 0],
          )
          if (best[1] > 0) setActiveAnchor(best[0])
        },
        { rootMargin: '-10% 0px -10% 0px', threshold: Array.from({ length: 11 }, (_, i) => i / 10) },
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [sections])

  // Close sheet on outside click
  useEffect(() => {
    if (!sheetOpen) return
    const handle = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setSheetOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [sheetOpen])

  if (sections.length < 2) return null

  const scrollTo = (anchor: string) => {
    const el = document.getElementById(anchor)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setSheetOpen(false)
  }

  const activeIndex = sections.findIndex((s) => s.anchor === activeAnchor)

  return (
    <>
      {/* ── Desktop pill (≥ 1024px) ─────────────────────────────────────── */}
      <nav
        role="navigation"
        aria-label="Portfolio sections"
        className={cn(
          'fixed right-5 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col gap-3 transition-all duration-300',
          visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none',
        )}
      >
        <div
          className="flex flex-col gap-2 py-3 px-3 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {sections.map(({ anchor, name }) => {
            const isActive = anchor === activeAnchor
            return (
              <button
                key={anchor}
                type="button"
                onClick={() => scrollTo(anchor)}
                aria-current={isActive ? 'location' : undefined}
                className={cn(
                  'text-left text-[9px] uppercase tracking-[0.25em] transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded',
                  isActive
                    ? 'text-[color:var(--portfolio-accent)] opacity-100'
                    : 'text-white/30 hover:text-white/60',
                )}
                style={{ fontFamily: "'Rubik Mono One', monospace" }}
                title={name}
              >
                {truncate(name)}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Tablet indicator (768–1023px) ────────────────────────────────── */}
      <div
        className={cn(
          'fixed right-4 bottom-24 z-50 hidden md:flex lg:hidden transition-all duration-300',
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      >
        <button
          type="button"
          onClick={() => setSheetOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-2 rounded-2xl text-white/50 hover:text-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          aria-label={`Section ${activeIndex + 1} of ${sections.length} — ${sections[activeIndex]?.name ?? ''}`}
          aria-expanded={sheetOpen}
        >
          <span
            className="text-[9px] uppercase tracking-widest text-[color:var(--portfolio-accent)]"
            style={{ fontFamily: "'Rubik Mono One', monospace" }}
          >
            {activeIndex + 1}/{sections.length}
          </span>
        </button>

        {/* Bottom sheet */}
        {sheetOpen && (
          <div
            ref={sheetRef}
            role="dialog"
            aria-label="Portfolio sections"
            className="absolute bottom-12 right-0 flex flex-col gap-2 py-3 px-4 rounded-2xl min-w-[160px]"
            style={{
              background: 'rgba(20,20,20,0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            {sections.map(({ anchor, name }) => {
              const isActive = anchor === activeAnchor
              return (
                <button
                  key={anchor}
                  type="button"
                  onClick={() => scrollTo(anchor)}
                  aria-current={isActive ? 'location' : undefined}
                  className={cn(
                    'text-left text-[10px] uppercase tracking-widest transition-colors py-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded',
                    isActive ? 'text-[color:var(--portfolio-accent)]' : 'text-white/40 hover:text-white/70',
                  )}
                  style={{ fontFamily: "'Rubik Mono One', monospace" }}
                >
                  {truncate(name)}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
