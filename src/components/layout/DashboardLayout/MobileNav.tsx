'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Archive, Search, Plus, Camera, User } from 'lucide-react'
import { cn } from '@/utilities/cn'

const mobileItems = [
  { icon: Archive, href: '/dashboard', label: 'Home' },
  { icon: Search, href: '/dashboard/search', label: 'Search' },
  { icon: Plus, href: '/dashboard/upload', label: 'Upload', primary: true },
  { icon: Camera, href: '/dashboard/library/sessions', label: 'Sessions' },
  { icon: User, href: '/account', label: 'Profile' },
]

export const MobileNav: React.FC = () => {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden w-[calc(100%-32px)] max-w-md">
      <div className="bg-gallery-surface/80 backdrop-blur-[20px] rounded-[32px] p-2 flex items-center justify-between shadow-[0px_20px_40px_rgba(0,0,0,0.15)] border border-black/[0.05] dark:border-white/[0.05]">
        {mobileItems.map((item) => {
          const isActive = pathname === item.href

          if (item.primary) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-[0px_8px_16px_rgba(0,0,0,0.1)] transition-all active:scale-95"
              >
                <item.icon size={28} />
              </Link>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 transition-all relative',
                isActive ? 'text-gallery-gold' : 'text-on-surface/40 hover:text-primary',
              )}
            >
              <item.icon
                size={22}
                className={cn('transition-transform', isActive && 'scale-110')}
              />
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-gallery-gold rounded-full shadow-[0_0_8px_rgba(127,87,0,0.8)]" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
