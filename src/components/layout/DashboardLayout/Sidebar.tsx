'use client'

import React from 'react'
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
  Clapperboard,
} from 'lucide-react'
import { cn } from '@/utilities/cn'
import { LogoIcon } from '@/components/Logo/LogoIcon'
import { Button } from '@/components/ui/button'
import { useUpload } from '@/providers/UploadProvider'

const navItems = [
  {
    label: 'LIBRARY',
    items: [
      { name: 'All Media', icon: Archive, href: '/dashboard/library' },
      { name: 'Sessions', icon: Clapperboard, href: '/dashboard/library/sessions' },
      { name: 'Collections', icon: FolderRoot, href: '/dashboard/library/collections' },
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

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[280px] flex-col bg-gallery-surface border-r border-black/[0.03] dark:border-white/[0.03] lg:flex z-40 transition-all duration-300">
      {/* Branding */}
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 overflow-hidden rounded-xl">
          <LogoIcon />
        </div>
        <span className="font-varela text-xl tracking-tight text-primary">Hub Archive</span>
      </div>

      {/* Primary Action */}
      <div className="px-6 mb-8">
        <Button variant="gallery" className="w-full h-12 gap-2" onClick={openPicker}>
          <PlusCircle size={18} />
          <span className="font-medium">Upload Media</span>
        </Button>
      </div>

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

      {/* Footer / System Status */}
      <div className="p-6 mt-auto">
        <div className="bg-white/40 p-4 rounded-2xl border border-white/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-rubik text-[9px] tracking-wider text-on-surface/40">STORAGE</span>
            <span className="font-rubik text-[9px] text-gallery-gold">84%</span>
          </div>
          <div className="h-1 bg-black/5 rounded-full overflow-hidden">
            <div className="h-full bg-gallery-gold w-[84%] rounded-full" />
          </div>
        </div>
      </div>
    </aside>
  )
}
