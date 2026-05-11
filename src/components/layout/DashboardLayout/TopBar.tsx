'use client'

import React from 'react'
import { Search, Bell } from 'lucide-react'
import { useAuth } from '@/providers/Auth'
import { UserDropdown } from './UserDropdown'

export const TopBar: React.FC = () => {
  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between bg-background/70 px-8 backdrop-blur-[20px] transition-all duration-300 border-b border-black/[0.03] dark:border-white/[0.03]">
      {/* Search Bar - Center */}
      <div className="flex-1 flex justify-center max-w-2xl mx-auto">
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface/30 group-focus-within:text-gallery-gold transition-colors" />
          <input
            type="text"
            placeholder="Search your visual archive..."
            className="w-full bg-gallery-surface/50 border-none h-11 pl-12 pr-4 rounded-[16px] text-sm focus:ring-2 focus:ring-gallery-gold/20 focus:bg-white transition-all outline-none"
          />
        </div>
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
