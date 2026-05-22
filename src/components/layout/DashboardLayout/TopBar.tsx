'use client'

import React, { Suspense } from 'react'
import { Bell } from 'lucide-react'
import { UserDropdown } from './UserDropdown'
import { GlobalSearch } from '@/components/GlobalSearch'

export const TopBar: React.FC = () => {
  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between bg-background/70 px-8 backdrop-blur-[20px] transition-all duration-300 border-b border-black/[0.03] dark:border-white/[0.03]">
      {/* Search Bar - Center */}
      <div className="flex-1 flex justify-center max-w-2xl mx-auto">
        <Suspense fallback={null}>
          <GlobalSearch />
        </Suspense>
      </div>

      {/* RHS Actions */}
      <div className="flex items-center gap-4 ml-8">
        <button className="p-2 text-on-surface/40 hover:text-primary transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-gallery-red rounded-full border-2 border-white" />
        </button>

        <UserDropdown />
      </div>
    </header>
  )
}
