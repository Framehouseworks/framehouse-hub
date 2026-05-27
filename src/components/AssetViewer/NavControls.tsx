'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface NavControlsProps {
  onPrev: () => void
  onNext: () => void
  currentIndex: number
  totalCount: number
}

/**
 * Always-visible prev/next controls. Positioned as edge "tabs" at the left
 * and right of the stage so they're accessible regardless of image aspect
 * ratio. Full-height touch zones (min 44px) satisfy mobile a11y targets.
 */
export const NavControls: React.FC<NavControlsProps> = ({
  onPrev,
  onNext,
  currentIndex,
  totalCount,
}) => (
  <>
    {/* ── Prev ──────────────────────────────────────────────────────── */}
    <button
      aria-label="Previous asset"
      onClick={(e) => {
        e.stopPropagation()
        onPrev()
      }}
      className={[
        'absolute left-0 top-1/2 -translate-y-1/2 z-20',
        // Tab shape: rounded only on the right side, flush against left edge
        'flex items-center justify-center',
        'w-11 h-16 rounded-r-[20px]',
        'bg-black/30 hover:bg-black/50 active:bg-black/70',
        'backdrop-blur-sm',
        'text-white/75 hover:text-white',
        'transition-colors duration-150',
        // Ensure minimum 44×44 touch target (h-16 = 64px satisfies height;
        // w-11 = 44px satisfies width)
      ].join(' ')}
    >
      <ChevronLeft size={18} strokeWidth={2.5} />
    </button>

    {/* ── Next ──────────────────────────────────────────────────────── */}
    <button
      aria-label="Next asset"
      onClick={(e) => {
        e.stopPropagation()
        onNext()
      }}
      className={[
        'absolute right-0 top-1/2 -translate-y-1/2 z-20',
        'flex items-center justify-center',
        'w-11 h-16 rounded-l-[20px]',
        'bg-black/30 hover:bg-black/50 active:bg-black/70',
        'backdrop-blur-sm',
        'text-white/75 hover:text-white',
        'transition-colors duration-150',
      ].join(' ')}
    >
      <ChevronRight size={18} strokeWidth={2.5} />
    </button>

    {/* ── Position counter ──────────────────────────────────────────── */}
    <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm pointer-events-none">
      <span className="text-[10px] font-bold font-rubik tracking-widest text-white/60">
        {currentIndex + 1} / {totalCount}
      </span>
    </div>
  </>
)
