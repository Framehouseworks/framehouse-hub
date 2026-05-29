'use client'

import { useState, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'
import * as Accordion from '@radix-ui/react-accordion'
import { cn } from '@/utilities/cn'
import { SearchInput } from '@/components/ui/search-input'
import { SessionCard, type SessionCardData } from './SessionCard'

type SortMode = 'recent' | 'oldest' | 'assets' | 'alpha'

const SORT_LABELS: Record<SortMode, string> = {
  recent: 'Most Recent',
  oldest: 'Oldest First',
  assets: 'Most Assets',
  alpha: 'A → Z',
}

function sortSessions(sessions: SessionCardData[], mode: SortMode): SessionCardData[] {
  return [...sessions].sort((a, b) => {
    if (mode === 'oldest') {
      return (a.shootDate ? new Date(a.shootDate).getTime() : 0) -
             (b.shootDate ? new Date(b.shootDate).getTime() : 0)
    }
    if (mode === 'assets') return b.assetCount - a.assetCount
    if (mode === 'alpha') return a.name.localeCompare(b.name)
    return (b.shootDate ? new Date(b.shootDate).getTime() : 0) -
           (a.shootDate ? new Date(a.shootDate).getTime() : 0)
  })
}

function groupByYear(sessions: SessionCardData[]): Map<string, SessionCardData[]> {
  const map = new Map<string, SessionCardData[]>()
  for (const s of sessions) {
    const key = s.shootDate ? String(new Date(s.shootDate).getFullYear()) : 'Undated'
    map.set(key, [...(map.get(key) ?? []), s])
  }
  return map
}

function isOlderThan12Months(year: string): boolean {
  if (year === 'Undated') return false
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 12)
  return Number(year) < cutoff.getFullYear()
}


interface SessionsClientProps {
  initialSessions: SessionCardData[]
}

export function SessionsClient({ initialSessions }: SessionsClientProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('recent')
  const [sortOpen, setSortOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q
      ? initialSessions.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.location?.address ?? '').toLowerCase().includes(q),
        )
      : initialSessions
    return sortSessions(base, sort)
  }, [initialSessions, search, sort])

  const grouped = useMemo(() => groupByYear(filtered), [filtered])

  const years = useMemo(
    () =>
      Array.from(grouped.keys()).sort((a, b) => {
        if (a === 'Undated') return 1
        if (b === 'Undated') return -1
        return Number(b) - Number(a)
      }),
    [grouped],
  )

  // Default-open: years newer than 12 months; older years collapsed
  const defaultOpenYears = useMemo(
    () => years.filter((y) => !isOlderThan12Months(y)),
    [years],
  )

  if (initialSessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-[20px] bg-[#445aa5]/10 flex items-center justify-center">
          <span className="text-2xl" aria-hidden="true">📷</span>
        </div>
        <p className="font-inter text-base font-medium text-primary">No sessions yet</p>
        <p className="font-inter text-sm text-on-surface/40 max-w-xs leading-relaxed">
          Sessions are created when you upload files. Upload your first assets and assign a
          session to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search — reuses shared SearchInput with container-focus pattern */}
        <div className="relative flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search sessions…"
            label="Search sessions"
          />
        </div>

        {/* Sort */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-2 px-4 h-11 rounded-[16px] bg-black/[0.04] dark:bg-white/[0.05] text-on-surface/70 hover:text-primary transition-colors w-full sm:w-auto cursor-pointer focus-within:shadow-[0_0_0_2px_rgba(215,153,34,0.35)] outline-none"
            aria-expanded={sortOpen}
            aria-label="Sort sessions"
          >
            <span className="font-inter">{SORT_LABELS[sort]}</span>
            <ChevronDown
              size={13}
              className={cn('ml-auto transition-transform', sortOpen && 'rotate-180')}
            />
          </button>
          {sortOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setSortOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-full mt-1.5 z-50 bg-white dark:bg-[#1a1c22] rounded-[16px] shadow-[0_12px_32px_rgba(0,0,0,0.14)] border-none p-1.5 min-w-[160px]">
                {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => { setSort(mode); setSortOpen(false) }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-[10px] text-sm transition-colors',
                      mode === sort
                        ? 'bg-[#445aa5]/10 text-[#445aa5] font-semibold'
                        : 'text-on-surface/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-primary',
                    )}
                  >
                    {SORT_LABELS[mode]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Empty search result ──────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <p className="font-inter text-sm text-on-surface/50">
            No sessions matching <em>&ldquo;{search}&rdquo;</em>
          </p>
        </div>
      )}

      {/* ── Year groups via Radix Accordion ─────────────────────────────── */}
      <Accordion.Root
        type="multiple"
        defaultValue={defaultOpenYears}
        className="space-y-8"
      >
        {years.map((year) => {
          const sessions = grouped.get(year)!
          return (
            <Accordion.Item key={year} value={year} className="border-none">
              <Accordion.Header>
                <Accordion.Trigger
                  className={cn(
                    'group flex w-full items-center gap-3 py-1',
                    'outline-none focus-visible:shadow-[0_0_0_2px_rgba(68,90,165,0.35)] rounded-[8px]',
                    '[&[data-state=open]>svg]:rotate-90',
                  )}
                >
                  <span className="font-rubik text-[11px] font-bold text-[#445aa5] tracking-[0.2em] uppercase">
                    {year}
                  </span>
                  <div className="flex-1 h-[2px] rounded-full bg-gradient-to-r from-[#445aa5]/10 to-transparent" />
                  <span className="font-rubik text-[9px] text-on-surface/30">
                    {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                  </span>
                  <ChevronDown
                    size={13}
                    className="text-on-surface/20 transition-transform duration-200 flex-shrink-0"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                <div className="flex flex-col gap-2.5 pt-3">
                  {sessions.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          )
        })}
      </Accordion.Root>
    </div>
  )
}
