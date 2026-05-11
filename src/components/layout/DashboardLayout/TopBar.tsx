'use client'

import React from 'react'
import { Search, Bell, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/providers/Auth'
import { cn } from '@/utilities/cn'
import { Input } from '@/components/ui/input'

export const TopBar: React.FC = () => {
  const { user } = useAuth()

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

        <div className="flex items-center gap-3 pl-4 border-l border-black/[0.03]">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-primary leading-none mb-1">
              {user?.name || 'Creative User'}
            </p>
            <p className="font-rubik text-[9px] tracking-wider text-on-surface/40 uppercase">
              {user?.roles?.[0] || 'VIEWER'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-[14px] bg-gallery-surface flex items-center justify-center text-primary/30 border border-black/[0.03] overflow-hidden">
            <UserIcon size={20} />
          </div>
        </div>
      </div>
    </header>
  )
}
