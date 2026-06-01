'use client'

import React from 'react'

export type ProductStorageVisualProps = {
  activeLabel: string
  activeDescription: string
  archiveLabel: string
  archiveDescription: string
}

export const ProductStorageVisual: React.FC<ProductStorageVisualProps> = ({
  activeLabel,
  activeDescription,
  archiveLabel,
  archiveDescription,
}) => {
  return (
    <div className="w-full space-y-4">
      {/* Active Library tier */}
      <div className="rounded-[20px] bg-white p-7 shadow-[0_20px_40px_rgba(26,28,28,0.06)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gallery-red/10">
            <div className="h-2.5 w-2.5 rounded-full bg-gallery-red" />
          </div>
          <span className="font-rubik text-[9px] tracking-[0.25em] uppercase text-gallery-red">
            {activeLabel}
          </span>
        </div>

        {/* Simulated file list */}
        <div className="mb-4 space-y-2">
          {['DSC_0412.RAW', 'EDIT_final_v3.TIF', 'studio_shot_009.JPG'].map((name) => (
            <div key={name} className="flex items-center gap-3 rounded-[12px] bg-[#f3f3f4] px-3 py-2.5">
              <div className="h-6 w-6 shrink-0 rounded-[6px] bg-gallery-red/20" />
              <span className="font-rubik text-[9px] tracking-[0.1em] text-foreground/60">{name}</span>
            </div>
          ))}
        </div>

        <p className="font-varela text-xs leading-relaxed text-muted-foreground">
          {activeDescription}
        </p>
      </div>

      {/* Cold Archive tier */}
      <div className="rounded-[20px] bg-[#f3f3f4] p-7">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#445aa5]/10">
            <div className="h-2.5 w-2.5 rounded-full bg-[#445aa5]" />
          </div>
          <span className="font-rubik text-[9px] tracking-[0.25em] uppercase text-[#445aa5]">
            {archiveLabel}
          </span>
        </div>

        {/* Simulated archived batches */}
        <div className="mb-4 space-y-2">
          {['2023 — Summer Campaign', '2022 — Client Work Archive'].map((name) => (
            <div key={name} className="flex items-center justify-between rounded-[12px] bg-white/60 px-3 py-2.5">
              <span className="font-rubik text-[9px] tracking-[0.1em] text-foreground/50">{name}</span>
              <span className="font-rubik text-[8px] tracking-[0.15em] uppercase text-foreground/30">
                Archived
              </span>
            </div>
          ))}
        </div>

        <p className="font-varela text-xs leading-relaxed text-muted-foreground">
          {archiveDescription}
        </p>
      </div>
    </div>
  )
}
