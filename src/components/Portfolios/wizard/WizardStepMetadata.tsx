'use client'

import React from 'react'
import { cn } from '@/utilities/cn'
import type { WizardState } from '../types'

interface Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
  slugPreview: string
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase block mb-1.5"
    >
      {children}
    </label>
  )
}

function FieldInput({
  id,
  value,
  onChange,
  placeholder,
  className,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full bg-gallery-surface/60 rounded-2xl px-4 py-3 text-sm text-primary placeholder:text-on-surface/30',
        'border border-transparent focus:border-gallery-gold/40 focus:outline-none focus:ring-0',
        'transition-colors duration-200',
        className,
      )}
      aria-label={placeholder}
    />
  )
}

export function WizardStepMetadata({ state, onChange, slugPreview }: Props) {
  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-primary">Portfolio details</h2>
        <p className="text-sm text-on-surface/40">Give your portfolio a title clients will see.</p>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div>
          <FieldLabel htmlFor="portfolio-title">Title *</FieldLabel>
          <FieldInput
            id="portfolio-title"
            value={state.title}
            onChange={(v) => onChange({ title: v, name: v || state.name })}
            placeholder="e.g. Nike Run Club — Autumn Lookbook"
          />
          {/* Slug preview */}
          {slugPreview && (
            <p className="mt-1.5 text-[10px] text-on-surface/30 truncate" aria-live="polite">
              <span className="text-gallery-gold/60">URL: </span>
              <span className="font-mono">
                {process.env.NEXT_PUBLIC_SERVER_URL ?? 'https://framehouseworks.com'}/p/
                {slugPreview}
              </span>
            </p>
          )}
        </div>

        {/* Subtitle */}
        <div>
          <FieldLabel htmlFor="portfolio-subtitle">Subtitle</FieldLabel>
          <FieldInput
            id="portfolio-subtitle"
            value={state.subtitle}
            onChange={(v) => onChange({ subtitle: v })}
            placeholder="e.g. Draft Delivery v2"
          />
        </div>

        {/* Description */}
        <div>
          <FieldLabel htmlFor="portfolio-description">Description</FieldLabel>
          <textarea
            id="portfolio-description"
            value={state.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Optional notes for this delivery…"
            maxLength={500}
            rows={3}
            className={cn(
              'w-full bg-gallery-surface/60 rounded-2xl px-4 py-3 text-sm text-primary placeholder:text-on-surface/30 resize-none',
              'border border-transparent focus:border-gallery-gold/40 focus:outline-none focus:ring-0',
              'transition-colors duration-200',
            )}
            aria-label="Portfolio description"
          />
          <p className="text-[10px] text-on-surface/25 text-right mt-1">
            {state.description.length}/500
          </p>
        </div>

        {/* Internal name (collapsed by default) */}
        <details className="group">
          <summary className="cursor-pointer text-[11px] text-on-surface/35 hover:text-on-surface/60 transition-colors list-none flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm border border-on-surface/20 inline-flex items-center justify-center text-[8px] group-open:border-gallery-gold/40 group-open:text-gallery-gold">
              +
            </span>
            Internal label (search & admin only)
          </summary>
          <div className="mt-3">
            <FieldLabel htmlFor="portfolio-name">Internal name</FieldLabel>
            <FieldInput
              id="portfolio-name"
              value={state.name}
              onChange={(v) => onChange({ name: v })}
              placeholder="Auto-filled from title"
            />
            <p className="text-[10px] text-on-surface/25 mt-1">
              Never shown to clients. Used for search in your dashboard.
            </p>
          </div>
        </details>
      </div>
    </div>
  )
}
