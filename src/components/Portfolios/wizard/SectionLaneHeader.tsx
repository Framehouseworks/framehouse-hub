'use client'

import React, { useRef, useState } from 'react'
import { GripVertical, ChevronUp, ChevronDown, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { cn } from '@/utilities/cn'
import type { WizardSection, SectionLayoutStyle, FilmstripTrackHeight, UniformGridColumns, SectionWidth } from '../types'

interface SectionLaneHeaderProps {
  section: WizardSection
  index: number
  total: number
  hasPortraitWarning: boolean
  isMobile: boolean
  onRename: (name: string) => void
  onLayoutChange: (style: SectionLayoutStyle) => void
  onTrackHeightChange: (h: FilmstripTrackHeight) => void
  onColumnsChange: (c: UniformGridColumns) => void
  onToggleHeader: () => void
  onTogglePreserveAspectRatio: () => void
  onWidthChange: (w: SectionWidth) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  dragHandleProps: Record<string, unknown>
}

const LAYOUT_OPTIONS: { value: SectionLayoutStyle; label: string }[] = [
  { value: 'masonry', label: 'Auto' },
  { value: 'filmstrip', label: 'Film' },
  { value: 'uniform_grid', label: 'Grid' },
]

const WIDTH_OPTIONS: { value: SectionWidth; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'wide', label: 'Wide' },
  { value: 'contained', label: 'Mid' },
  { value: 'narrow', label: 'Narrow' },
]

const TRACK_OPTIONS: { value: FilmstripTrackHeight; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfy' },
  { value: 'editorial', label: 'Editorial' },
]

const COL_OPTIONS: { value: UniformGridColumns; label: string }[] = [
  { value: '2', label: '2 col' },
  { value: '3', label: '3 col' },
  { value: '4', label: '4 col' },
]

export function SectionLaneHeader({
  section,
  index,
  total,
  hasPortraitWarning,
  isMobile,
  onRename,
  onLayoutChange,
  onTrackHeightChange,
  onColumnsChange,
  onToggleHeader,
  onTogglePreserveAspectRatio,
  onWidthChange,
  onMoveUp,
  onMoveDown,
  onDelete,
  dragHandleProps,
}: SectionLaneHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(section.sectionName)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(section.sectionName)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed !== section.sectionName) onRename(trimmed)
  }

  // Derive anchor preview (client-side approximation)
  const anchorPreview = (section.sectionName || 'section')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  return (
    <div className="flex flex-col gap-2 pb-3 border-b border-on-surface/8">
      {/* Row 1: drag handle + name + mobile move buttons + delete */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Desktop drag handle */}
        {!isMobile && (
          <div
            {...dragHandleProps}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-[#7f5700]/60 cursor-grab active:cursor-grabbing hover:text-[#7f5700] transition-colors touch-none"
            aria-label="Drag to reorder section"
          >
            <GripVertical size={14} aria-hidden="true" />
          </div>
        )}

        {/* Section name */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') { setEditing(false); setDraft(section.sectionName) }
              }}
              className="w-full bg-transparent border-b border-[#7f5700]/60 text-sm font-medium text-primary focus:outline-none py-2 pr-2"
              aria-label="Section name"
              maxLength={80}
            />
          ) : (
            <button
              type="button"
              onDoubleClick={startEdit}
              onClick={startEdit}
              className="text-left w-full text-sm font-medium text-primary truncate hover:text-[#7f5700] transition-colors"
              aria-label={`Section name: ${section.sectionName || 'Unnamed section'}. Click to rename.`}
              title="Click to rename"
            >
              {section.sectionName || <span className="text-on-surface/30 italic">Unnamed section</span>}
            </button>
          )}
          {/* Anchor preview */}
          <p
            className="font-['Rubik_Mono_One',monospace] text-[9px] text-[#7f5700]/40 mt-0.5 truncate"
            aria-label={`Section anchor: #${anchorPreview}`}
          >
            #{anchorPreview}
          </p>
        </div>

        {/* Item count */}
        <span
          className="flex-shrink-0 font-['Rubik_Mono_One',monospace] text-[9px] text-on-surface/30 bg-on-surface/5 px-2 py-0.5 rounded-full"
          aria-label={`${section.items.length} assets in this section`}
        >
          {section.items.length}
        </span>

        {/* Mobile up/down — 44px minimum touch targets (WCAG 2.5.5) */}
        {isMobile && (
          <div className="flex flex-shrink-0 gap-1">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="min-w-[44px] h-11 flex items-center justify-center rounded-xl bg-on-surface/5 text-on-surface/40 hover:text-primary disabled:opacity-30 transition-colors"
              aria-label="Move section up"
            >
              <ChevronUp size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="min-w-[44px] h-11 flex items-center justify-center rounded-xl bg-on-surface/5 text-on-surface/40 hover:text-primary disabled:opacity-30 transition-colors"
              aria-label="Move section down"
            >
              <ChevronDown size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Delete — 44px touch target */}
        <button
          type="button"
          onClick={onDelete}
          disabled={total <= 1}
          className="flex-shrink-0 min-w-[44px] h-11 flex items-center justify-center rounded-xl text-on-surface/30 hover:text-[#bb1800] hover:bg-[#bb1800]/10 disabled:opacity-20 transition-colors"
          aria-label={`Delete section ${section.sectionName || 'this section'}`}
        >
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>

      {/* Row 2: layout switcher + conditional sub-options */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Layout style pills */}
        <div
          role="radiogroup"
          aria-label="Layout style"
          className="flex rounded-full overflow-hidden bg-on-surface/5"
        >
          {LAYOUT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={section.layoutStyle === opt.value}
              onClick={() => onLayoutChange(opt.value)}
              className={cn(
                'px-3 py-2 text-[10px] font-medium tracking-wide transition-all min-h-[36px]',
                section.layoutStyle === opt.value
                  ? 'bg-[#7f5700] text-white'
                  : 'text-on-surface/40 hover:text-on-surface/70',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filmstrip track height */}
        {section.layoutStyle === 'filmstrip' && (
          <div
            role="radiogroup"
            aria-label="Track height"
            className="flex rounded-full overflow-hidden bg-on-surface/5"
          >
            {TRACK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={section.filmstripTrackHeight === opt.value}
                onClick={() => onTrackHeightChange(opt.value)}
                className={cn(
                  'px-3 py-2 text-[10px] font-medium transition-all min-h-[36px]',
                  section.filmstripTrackHeight === opt.value
                    ? 'bg-[#7f5700]/60 text-white'
                    : 'text-on-surface/30 hover:text-on-surface/60',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Uniform grid columns */}
        {section.layoutStyle === 'uniform_grid' && (
          <div
            role="radiogroup"
            aria-label="Column count"
            className="flex rounded-full overflow-hidden bg-on-surface/5"
          >
            {COL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={section.uniformGridColumns === opt.value}
                onClick={() => onColumnsChange(opt.value)}
                className={cn(
                  'px-3 py-2 text-[10px] font-medium transition-all min-h-[36px]',
                  section.uniformGridColumns === opt.value
                    ? 'bg-[#7f5700]/60 text-white'
                    : 'text-on-surface/30 hover:text-on-surface/60',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Show header toggle */}
        <button
          type="button"
          onClick={onToggleHeader}
          className={cn(
            'flex items-center gap-1.5 text-[10px] transition-colors rounded-full px-3 py-2 min-h-[36px]',
            section.showSectionHeader
              ? 'text-[#7f5700] bg-[#7f5700]/10'
              : 'text-on-surface/30 hover:text-on-surface/60 bg-on-surface/5',
          )}
          aria-pressed={section.showSectionHeader}
          aria-label="Toggle section heading visibility for clients"
        >
          {section.showSectionHeader ? <Eye size={10} aria-hidden="true" /> : <EyeOff size={10} aria-hidden="true" />}
          {section.showSectionHeader ? 'Heading on' : 'Heading off'}
        </button>

        {/* Preserve aspect ratio — masonry only */}
        {section.layoutStyle === 'masonry' && (
          <button
            type="button"
            onClick={onTogglePreserveAspectRatio}
            className={cn(
              'flex items-center gap-1.5 text-[10px] transition-colors rounded-full px-3 py-2 min-h-[36px]',
              section.preserveAspectRatio
                ? 'text-[#7f5700] bg-[#7f5700]/10'
                : 'text-on-surface/30 hover:text-on-surface/60 bg-on-surface/5',
            )}
            aria-pressed={section.preserveAspectRatio}
            aria-label="Preserve original image aspect ratios — no cropping"
          >
            {section.preserveAspectRatio ? '⊟ Natural' : '⊟ Crop'}
          </button>
        )}

        {/* Section width */}
        <div role="radiogroup" aria-label="Section width" className="flex rounded-full overflow-hidden bg-on-surface/5">
          {WIDTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={section.sectionWidth === opt.value}
              onClick={() => onWidthChange(opt.value)}
              className={cn(
                'px-2.5 py-2 text-[10px] font-medium transition-all min-h-[36px]',
                section.sectionWidth === opt.value
                  ? 'bg-[#7f5700]/60 text-white'
                  : 'text-on-surface/30 hover:text-on-surface/60',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Portrait warning */}
        {hasPortraitWarning && !section.preserveAspectRatio && (
          <div role="alert" className="flex items-center gap-1 text-[9px] text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
            <AlertTriangle size={9} aria-hidden="true" />
            {section.layoutStyle === 'filmstrip' ? 'Portrait — blur fill applied' : 'Natural ratio recommended'}
          </div>
        )}
      </div>
    </div>
  )
}
