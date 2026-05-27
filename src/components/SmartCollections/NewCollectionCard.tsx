'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/utilities/cn'

interface NewCollectionCardProps {
  onClick: () => void
}

export function NewCollectionCard({ onClick }: NewCollectionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full flex flex-col items-center justify-center gap-3',
        'border-2 border-dashed border-[#d5c4af]/30 rounded-[24px]',
        'p-8 text-center transition-all duration-300',
        'hover:border-gallery-gold/30 hover:bg-gallery-gold/[0.03]',
        'aspect-[4/5] sm:aspect-auto min-h-[180px]',
      )}
      aria-label="Create new collection"
    >
      <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#d5c4af]/40 group-hover:border-gallery-gold/40 flex items-center justify-center transition-colors">
        <Plus size={20} className="text-[#1a1c1c]/30 group-hover:text-gallery-gold transition-colors" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#1a1c1c]/50 group-hover:text-gallery-gold transition-colors">
          New Collection
        </p>
        <p className="text-xs text-[#1a1c1c]/30 mt-1 leading-relaxed">
          Organise your assets with custom rules
        </p>
      </div>
    </button>
  )
}
