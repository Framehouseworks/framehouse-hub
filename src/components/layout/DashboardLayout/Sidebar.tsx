'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Archive,
  Search,
  FolderRoot,
  LayoutGrid,
  Settings,
  PlusCircle,
  CloudUpload,
  Camera,
  BookImage,
} from 'lucide-react'
import { cn } from '@/utilities/cn'
import { LogoIcon } from '@/components/Logo/LogoIcon'
import { Button } from '@/components/ui/button'
import { useUpload } from '@/providers/UploadProvider'
import { useAuth } from '@/providers/Auth'

type StorageSummary = { usagePercent: number; totalBytes: number; tierLimitBytes: number }

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const val = bytes / 1024 ** i
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`
}

function SidebarStorage() {
  const { status } = useAuth()
  const [storage, setStorage] = useState<StorageSummary | null>(null)

  const fetchStorage = useCallback(async () => {
    if (status !== 'loggedIn') return
    try {
      const res = await fetch('/api/users/me/storage', { credentials: 'include' })
      if (res.ok) setStorage(await res.json())
    } catch { /* non-fatal */ }
  }, [status])

  useEffect(() => {
    void fetchStorage()
    const id = setInterval(fetchStorage, 30_000)
    return () => clearInterval(id)
  }, [fetchStorage])

  if (!storage) return null

  const pct = Math.min(Math.round(storage.usagePercent), 100)
  const isWarning = pct >= 80 && pct < 100
  const isOverage = pct >= 100
  const barColor = isOverage ? 'bg-gallery-red' : isWarning ? 'bg-amber-500' : 'bg-gallery-gold'
  const pctColor = isOverage ? 'text-gallery-red' : isWarning ? 'text-amber-500' : 'text-gallery-gold'

  return (
    <div className="bg-white/40 dark:bg-white/[0.04] p-4 rounded-2xl">
      <div className="flex items-center justify-between mb-2">
        <span className="font-rubik text-[9px] tracking-wider text-on-surface/40 uppercase">Storage</span>
        <span className={cn('font-rubik text-[9px]', pctColor)}>{pct}%</span>
      </div>
      <div
        className="h-1 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Storage ${pct}% used`}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-700', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-on-surface/30 mt-1.5">
        {formatBytes(storage.totalBytes)} of {formatBytes(storage.tierLimitBytes)}
      </p>
      {isOverage && (
        <Link
          href="/pricing"
          className="block mt-2 text-[10px] text-gallery-red font-medium hover:underline"
        >
          Upgrade tier →
        </Link>
      )}
    </div>
  )
}

const navItems = [
  {
    label: 'LIBRARY',
    items: [
      { name: 'Archive', icon: Archive, href: '/dashboard/library' },
      { name: 'Sessions', icon: Camera, href: '/dashboard/library/sessions' },
      { name: 'Collections', icon: FolderRoot, href: '/dashboard/library/collections' },
    ],
  },
  {
    label: 'PUBLISH',
    items: [
      { name: 'Portfolios', icon: BookImage, href: '/dashboard/portfolios' },
      { name: 'Shared', icon: LayoutGrid, href: '/dashboard/shared' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { name: 'Archive Work', icon: CloudUpload, href: '/dashboard/upload' },
      { name: 'Search Index', icon: Search, href: '/dashboard/search' },
      { name: 'Settings', icon: Settings, href: '/dashboard/settings' },
    ],
  },
]

export const Sidebar: React.FC = () => {
  const pathname = usePathname()
  const { openPicker } = useUpload()
  const { user } = useAuth()
  const isCreative = user?.roles?.some((r) => r === 'creative' || r === 'admin') ?? false

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[280px] flex-col bg-gallery-surface border-r border-black/[0.03] dark:border-white/[0.03] lg:flex z-40 transition-all duration-300">
      {/* Branding */}
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 shrink-0 flex items-center justify-center">
          <LogoIcon size={40} />
        </div>
        <span className="font-varela text-xl tracking-tight text-primary">Hub Archive</span>
      </div>

      {/* Primary Action — creatives and admins only */}
      {isCreative && (
        <div className="px-6 mb-8">
          <Button variant="gallery" className="w-full h-12 gap-2" onClick={openPicker}>
            <PlusCircle size={18} />
            <span className="font-medium">Upload Media</span>
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 overflow-y-auto scrollbar-hide">
        {navItems.map((group) => (
          <div key={group.label} className="mb-10">
            <h3 className="px-4 mb-4 font-rubik text-[10px] tracking-[0.2em] text-on-surface/40 uppercase">
              {group.label}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  item.href === '/dashboard/library'
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + '/')
                const isUploadAction = item.name === 'Archive Work'

                // Hide upload-triggering nav items for viewers
                if (isUploadAction && !isCreative) return null

                return (
                  <li key={item.name}>
                    <Link
                      href={isUploadAction ? '#' : item.href}
                      onClick={(e) => {
                        if (isUploadAction) {
                          e.preventDefault()
                          openPicker()
                        }
                      }}
                      className={cn(
                        'relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all duration-300 group',
                        isActive
                          ? 'bg-white/80 dark:bg-white/5 text-primary font-bold'
                          : 'text-on-surface/60 hover:text-primary hover:bg-white/50 font-medium',
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gallery-gold rounded-r-full shadow-[2px_0_8px_rgba(127,87,0,0.4)]" />
                      )}
                      <item.icon
                        size={18}
                        className={cn(
                          'transition-colors',
                          isActive
                            ? 'text-gallery-gold'
                            : 'text-on-surface/30 group-hover:text-on-surface/60',
                        )}
                      />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer / Storage widget */}
      <div className="p-6 mt-auto">
        <SidebarStorage />
      </div>
    </aside>
  )
}
