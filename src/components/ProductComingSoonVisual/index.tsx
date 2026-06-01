'use client'

import React from 'react'

export type ProductComingSoonVisualProps = {
  label?: string
}

export const ProductComingSoonVisual: React.FC<ProductComingSoonVisualProps> = ({
  label = 'In development',
}) => {
  return (
    <div className="relative w-full overflow-hidden rounded-[24px] bg-[#f3f3f4]" style={{ aspectRatio: '4/3' }}>
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(26,28,28,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(26,28,28,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />

      {/* Blur overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/40 backdrop-blur-[2px]">
        <span className="inline-flex items-center rounded-full bg-gallery-red px-4 py-1.5 font-rubik text-[9px] tracking-[0.25em] uppercase text-white shadow-lg">
          Coming soon
        </span>
        <p className="font-rubik text-[10px] tracking-[0.15em] uppercase text-foreground/40">
          {label}
        </p>
      </div>
    </div>
  )
}
