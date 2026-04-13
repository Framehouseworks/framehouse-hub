'use client'
import React from 'react'

export const NavItemRowLabel = ({ data, index }: { data: any; index: number }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontWeight: 'bold' }}>
        {data?.link?.label || data?.menuTitle || `Item ${index + 1}`}
      </span>
      {data?.group && <span style={{ opacity: 0.5, fontSize: '12px' }}>(Group)</span>}
    </div>
  )
}

export const PillarRowLabel = ({ data, index }: { data: any; index: number }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontWeight: 'bold' }}>
        {data?.title || `Pillar ${index + 1}`}
      </span>
    </div>
  )
}
