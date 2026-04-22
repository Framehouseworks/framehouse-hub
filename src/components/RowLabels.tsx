'use client'
import React from 'react'

export const NavItemRowLabel = ({ data, index }: { data: Record<string, unknown>; index: number }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontWeight: 'bold' }}>
        {((data?.link as Record<string, unknown>)?.label as string) || (data?.menuTitle as string) || `Item ${index + 1}`}      </span>
      {!!data?.group && <span style={{ opacity: 0.5, fontSize: '12px' }}>(Group)</span>}    </div>
  )
}

export const PillarRowLabel = ({ data, index }: { data: Record<string, unknown>; index: number }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontWeight: 'bold' }}>
        {(data?.title as string) || `Pillar ${index + 1}`}      </span>
    </div>
  )
}
