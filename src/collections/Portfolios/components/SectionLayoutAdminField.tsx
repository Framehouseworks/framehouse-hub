'use client'

/**
 * SectionLayoutAdminField — Payload 3.x custom Field component for `layoutStyle`.
 *
 * Renders the same pill-group UI used in the creator wizard so administrators
 * remediating client issues can visually switch layout styles without relying on
 * the raw select dropdown. Conditionally surfaces track-height and column controls
 * inline so all section display settings are co-located.
 */

import { useField, useWatchForm } from '@payloadcms/ui'
import React from 'react'

type LayoutStyle = 'masonry' | 'filmstrip' | 'uniform_grid'
type TrackHeight = 'compact' | 'comfortable' | 'editorial'
type Columns = '2' | '3' | '4'

const LAYOUT_OPTIONS: { value: LayoutStyle; label: string; description: string }[] = [
  { value: 'masonry', label: 'Auto', description: 'Justified rows, natural proportions' },
  { value: 'filmstrip', label: 'Filmstrip', description: 'Horizontal cinematic reel' },
  { value: 'uniform_grid', label: 'Grid', description: 'Fixed-column mosaic' },
]

const TRACK_OPTIONS: { value: TrackHeight; label: string; px: string }[] = [
  { value: 'compact', label: 'Compact', px: '280px' },
  { value: 'comfortable', label: 'Comfortable', px: '400px' },
  { value: 'editorial', label: 'Editorial', px: '560px' },
]

const COL_OPTIONS: { value: Columns; label: string }[] = [
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
]

function PillGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  renderLabel,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  label: string
  renderLabel?: (opt: { value: T; label: string }) => React.ReactNode
}) {
  return (
    <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend
        style={{
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--theme-elevation-500)',
          marginBottom: '6px',
          display: 'block',
        }}
      >
        {label}
      </legend>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.value)}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: selected ? '2px solid #7f5700' : '2px solid var(--theme-elevation-150)',
                background: selected ? '#7f5700' : 'transparent',
                color: selected ? '#fff' : 'var(--theme-elevation-800)',
                fontSize: '11px',
                fontWeight: selected ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                lineHeight: 1.2,
                minHeight: '32px',
                minWidth: '44px',
              }}
            >
              {renderLabel ? renderLabel(opt) : opt.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function SectionLayoutAdminField({ path }: { path: string }) {
  const { value: layoutStyle, setValue: setLayoutStyle } = useField<LayoutStyle>({ path })

  // Derive sibling field paths from this field's path
  // e.g. "layoutBlocks.0.filmstripTrackHeight"
  const parentPath = path.substring(0, path.lastIndexOf('.'))
  const trackPath = `${parentPath}.filmstripTrackHeight`
  const colsPath = `${parentPath}.uniformGridColumns`

  const { value: trackHeight, setValue: setTrackHeight } = useField<TrackHeight>({ path: trackPath })
  const { value: columns, setValue: setColumns } = useField<Columns>({ path: colsPath })

  const currentLayout = layoutStyle ?? 'masonry'
  const currentTrack = trackHeight ?? 'comfortable'
  const currentCols = columns ?? '3'

  const selectedLayoutMeta = LAYOUT_OPTIONS.find((o) => o.value === currentLayout)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '12px 0',
      }}
    >
      {/* Label row */}
      <div>
        <p
          style={{
            fontSize: '11px',
            color: 'var(--theme-elevation-500)',
            margin: '0 0 10px',
          }}
        >
          Controls the visual presentation style of this section on the client-facing portfolio.
        </p>

        <PillGroup<LayoutStyle>
          label="Layout Style"
          options={LAYOUT_OPTIONS}
          value={currentLayout}
          onChange={(v) => setLayoutStyle(v)}
          renderLabel={(opt) => (
            <span
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
            >
              <span>{opt.label}</span>
            </span>
          )}
        />

        {selectedLayoutMeta && (
          <p
            style={{
              fontSize: '10px',
              color: 'var(--theme-elevation-500)',
              marginTop: '6px',
              fontStyle: 'italic',
            }}
          >
            {selectedLayoutMeta.description}
          </p>
        )}
      </div>

      {/* Filmstrip track height — only when filmstrip selected */}
      {currentLayout === 'filmstrip' && (
        <PillGroup<TrackHeight>
          label="Track Height"
          options={TRACK_OPTIONS}
          value={currentTrack}
          onChange={(v) => setTrackHeight(v)}
          renderLabel={(opt) => (
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
              <span>{(opt as typeof TRACK_OPTIONS[number]).label}</span>
              <span style={{ fontSize: '9px', opacity: 0.6 }}>
                {(opt as typeof TRACK_OPTIONS[number]).px}
              </span>
            </span>
          )}
        />
      )}

      {/* Column count — only when uniform_grid selected */}
      {currentLayout === 'uniform_grid' && (
        <PillGroup<Columns>
          label="Columns"
          options={COL_OPTIONS}
          value={currentCols}
          onChange={(v) => setColumns(v)}
        />
      )}
    </div>
  )
}
