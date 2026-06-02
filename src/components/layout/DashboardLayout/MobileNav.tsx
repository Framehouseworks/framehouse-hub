'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Archive,
  Plus,
  Camera,
  FolderRoot,
  UserCircle,
  X,
  MoreHorizontal,
  Share2,
  BookImage,
} from 'lucide-react'
import { cn } from '@/utilities/cn'
import { useUpload } from '@/providers/UploadProvider'
import { useAuth } from '@/providers/Auth'

// Primary floating nav — 2 left · FAB · 2 right
// /dashboard redirects to /dashboard/library — treat both as the Library home
const PRIMARY_NAV = [
  { icon: Archive, href: '/dashboard/library', label: 'Archive', exact: true },
  { icon: Camera, href: '/dashboard/library/sessions', label: 'Sessions', exact: false },
  { icon: FolderRoot, href: '/dashboard/library/collections', label: 'Collections', exact: false },
  { icon: MoreHorizontal, href: null as string | null, label: 'More', exact: false },
] as const

// Items surfaced inside the "More" bottom sheet
const MORE_NAV = [
  { icon: BookImage, href: '/dashboard/portfolios', label: 'Portfolios' },
  { icon: Share2, href: '/dashboard/shared', label: 'Shared' },
  { icon: UserCircle, href: '/account', label: 'Account' },
]

const MORE_ROUTES = MORE_NAV.map((i) => i.href)

function isPathActive(pathname: string, href: string, exact: boolean): boolean {
  // Library root covers /dashboard (redirect source) and /dashboard/library only
  if (href === '/dashboard/library') {
    return pathname === '/dashboard' || pathname === '/dashboard/library'
  }
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

export const MobileNav: React.FC = () => {
  const pathname = usePathname()
  const { openPicker } = useUpload()
  const { user } = useAuth()
  const isCreative = user?.roles?.some((r) => r === 'creative' || r === 'admin') ?? false
  const [moreOpen, setMoreOpen] = useState(false)

  // Close sheet on route change
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  // Trap body scroll while sheet is open
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [moreOpen])

  const isMoreActive = MORE_ROUTES.some(
    (href) => pathname === href || pathname.startsWith(href + '/'),
  )

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden',
          'transition-opacity duration-300',
          moreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMoreOpen(false)}
      />

      {/* ── More Bottom Sheet ── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More navigation options"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 lg:hidden',
          'bg-gallery-surface/95 backdrop-blur-[28px]',
          'rounded-t-[28px]',
          'shadow-[0px_-24px_64px_rgba(0,0,0,0.18)]',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          moreOpen ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-9 h-1 bg-on-surface/20 rounded-full" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3">
          <span className="font-rubik text-[9px] tracking-[0.22em] text-on-surface/35 uppercase">
            Navigate
          </span>
          <button
            onClick={() => setMoreOpen(false)}
            aria-label="Close menu"
            className="w-7 h-7 flex items-center justify-center rounded-full bg-on-surface/5 text-on-surface/40 active:scale-90 transition-transform"
          >
            <X size={14} />
          </button>
        </div>

        {/* Items grid */}
        <div className="px-3 pb-4 grid grid-cols-3 gap-1">
          {MORE_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3.5 px-1 rounded-2xl transition-all duration-200 active:scale-95',
                  active
                    ? 'bg-gallery-gold/10 text-gallery-gold'
                    : 'text-on-surface/45 hover:bg-on-surface/5',
                )}
              >
                <item.icon size={21} />
                <span className={cn('text-[10px] font-medium leading-none', active && 'font-semibold')}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Safe area inset */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>

      {/* ── Floating Bottom Nav ── */}
      <nav
        aria-label="Primary navigation"
        className="fixed z-40 lg:hidden"
        style={{
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '22rem',
        }}
      >
        <div className="bg-gallery-surface/85 backdrop-blur-[24px] rounded-[28px] px-1.5 py-1.5 flex items-center shadow-[0px_20px_48px_rgba(0,0,0,0.18),0px_4px_12px_rgba(0,0,0,0.08)] border border-black/[0.05] dark:border-white/[0.05]">

          {/* Left pair */}
          {PRIMARY_NAV.slice(0, 2).map((item) => {
            const active = isPathActive(pathname, item.href!, item.exact)
            return (
              <Link
                key={item.label}
                href={item.href!}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-[20px] transition-all duration-200',
                  active
                    ? 'bg-gallery-gold/10 text-gallery-gold'
                    : 'text-on-surface/35 hover:text-on-surface/60',
                )}
              >
                <item.icon
                  size={19}
                  className={cn('transition-transform duration-200', active && 'scale-110')}
                />
                <span className={cn('text-[9.5px] font-medium leading-none tracking-wide', active && 'font-semibold')}>
                  {item.label}
                </span>
              </Link>
            )
          })}

          {/* Centre FAB — creatives and admins only */}
          {isCreative ? (
            <button
              onClick={openPicker}
              aria-label="Upload media"
              className="mx-1 flex-shrink-0 w-[52px] h-[52px] rounded-full flex items-center justify-center bg-primary transition-all duration-200 active:scale-90"
              style={{ boxShadow: '0px 6px 14px -2px hsla(41,100%,25%,0.45)' }}
            >
              <Plus size={24} strokeWidth={2.5} className="text-white dark:text-primary-foreground" />
            </button>
          ) : (
            <div className="mx-1 flex-shrink-0 w-[52px]" aria-hidden="true" />
          )}

          {/* Right: Collections */}
          {(() => {
            const item = PRIMARY_NAV[2]
            const active = isPathActive(pathname, item.href!, item.exact)
            return (
              <Link
                key={item.label}
                href={item.href!}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-[20px] transition-all duration-200',
                  active
                    ? 'bg-gallery-gold/10 text-gallery-gold'
                    : 'text-on-surface/35 hover:text-on-surface/60',
                )}
              >
                <item.icon
                  size={19}
                  className={cn('transition-transform duration-200', active && 'scale-110')}
                />
                <span className={cn('text-[9.5px] font-medium leading-none tracking-wide', active && 'font-semibold')}>
                  {item.label}
                </span>
              </Link>
            )
          })()}

          {/* Right: More */}
          <button
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-label="More navigation options"
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-[20px] transition-all duration-200',
              isMoreActive || moreOpen
                ? 'bg-gallery-gold/10 text-gallery-gold'
                : 'text-on-surface/35 hover:text-on-surface/60',
            )}
          >
            <MoreHorizontal
              size={19}
              className={cn(
                'transition-transform duration-200',
                (isMoreActive || moreOpen) && 'scale-110',
              )}
            />
            <span className={cn('text-[9.5px] font-medium leading-none tracking-wide', (isMoreActive || moreOpen) && 'font-semibold')}>
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}
