'use client'

import React, { useEffect, useRef, useState } from 'react'
import { User, Palette, HardDrive, ShieldCheck } from 'lucide-react'
import { cn } from '@/utilities/cn'

const NAV_ITEMS = [
  { id: 'profile', label: 'Profile Identity', icon: User },
  { id: 'defaults', label: 'Portfolio Defaults', icon: Palette },
  { id: 'storage', label: 'Cloud Storage', icon: HardDrive },
  { id: 'security', label: 'Security', icon: ShieldCheck },
] as const

type SectionId = (typeof NAV_ITEMS)[number]['id']

function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // After scroll, move focus to the section heading for screen readers
  const heading = el.querySelector('h2')
  if (heading) {
    heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }
}

function useActiveSectionObserver() {
  const [active, setActive] = useState<SectionId>('profile')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const ratios = new Map<string, number>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => ratios.set(e.target.id, e.intersectionRatio))
        let best: SectionId = 'profile'
        let bestRatio = -1
        ratios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio
            best = id as SectionId
          }
        })
        setActive(best)
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '-80px 0px -30% 0px' },
    )

    NAV_ITEMS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observerRef.current?.observe(el)
    })

    return () => observerRef.current?.disconnect()
  }, [])

  return active
}

type Props = {
  /** When true, renders only the desktop sticky column nav (no mobile chip strip) */
  desktopOnly?: boolean
}

export const AccountSettingsSidebar: React.FC<Props> = ({ desktopOnly = false }) => {
  const active = useActiveSectionObserver()

  // Desktop sticky column nav
  if (desktopOnly) {
    return (
      <nav aria-label="Settings sections" className="flex flex-col gap-1">
        <p className="px-3 mb-3 font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase">
          Settings
        </p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => scrollToSection(id)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left w-full transition-all duration-200',
              active === id
                ? 'bg-gallery-gold/10 text-gallery-gold'
                : 'text-on-surface/50 hover:text-on-surface/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]',
            )}
          >
            <Icon
              size={16}
              className={cn('shrink-0 transition-colors', active === id ? 'text-gallery-gold' : 'text-on-surface/30')}
            />
            {label}
          </button>
        ))}
      </nav>
    )
  }

  // Mobile-only horizontal chip strip — hidden at lg+
  return (
    <nav
      aria-label="Settings sections"
      className="lg:hidden sticky top-[80px] z-20 bg-background/90 backdrop-blur-[12px] -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 flex gap-2 overflow-x-auto scrollbar-hide border-b border-black/[0.03] dark:border-white/[0.03] mb-6"
    >
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => scrollToSection(id)}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 min-h-[36px] touch-manipulation',
            active === id
              ? 'bg-gallery-gold/10 text-gallery-gold border border-gallery-gold/20'
              : 'text-on-surface/50 bg-gallery-surface border border-transparent',
          )}
        >
          <Icon size={13} className="shrink-0" aria-hidden="true" />
          {label}
        </button>
      ))}
    </nav>
  )
}
