'use client'

import React from 'react'
import { cn } from '@/utilities/cn'
import type { WizardState } from '../types'

interface Props {
  state: WizardState
  onChange: (patch: Partial<WizardState>) => void
}

const FONT_PAIRINGS = [
  { value: 'modern-sans', label: 'Modern Sans', sample: 'Inter' },
  { value: 'classic-serif', label: 'Classic Serif', sample: 'Playfair Display' },
  { value: 'tech-mono', label: 'Technical Mono', sample: 'IBM Plex Mono' },
] as const

const DENSITY_OPTIONS = [
  { value: 'small', label: 'Compact' },
  { value: 'medium', label: 'Comfortable' },
  { value: 'large', label: 'Editorial' },
] as const

const COLOR_PRESETS = [
  { label: 'Midnight', bg: '#0a0a0a', text: '#f5f5f5', accent: '#d79922' },
  { label: 'Studio White', bg: '#fafafa', text: '#1a1c1c', accent: '#7f5700' },
  { label: 'Warm Ivory', bg: '#f5f0e8', text: '#2c2420', accent: '#8b5e3c' },
  { label: 'Slate', bg: '#1e2329', text: '#e8ecf0', accent: '#7fa3c4' },
]

function ColorSwatch({
  label,
  color,
  onChange,
}: {
  label: string
  color: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-on-surface/10 flex-shrink-0">
        <div className="absolute inset-0" style={{ background: color }} />
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label={`Choose ${label} colour`}
        />
      </div>
      <div>
        <p className="text-xs font-medium text-primary">{label}</p>
        <p className="font-mono text-[10px] text-on-surface/30">{color}</p>
      </div>
    </div>
  )
}

export function WizardStepTheme({ state, onChange }: Props) {
  const theme = state.theme

  function setTheme(patch: Partial<WizardState['theme']>) {
    onChange({ theme: { ...theme, ...patch } })
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 w-full">
      {/* Controls */}
      <div className="flex flex-col gap-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-primary">Theme & style</h2>
          <p className="text-xs text-on-surface/40">
            These settings apply to your published portfolio page.
          </p>
        </div>

        {/* Font pairing */}
        <div>
          <p className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase mb-3">
            Font pairing
          </p>
          <div className="flex flex-col gap-2">
            {FONT_PAIRINGS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTheme({ fontPairing: f.value })}
                aria-pressed={theme.fontPairing === f.value}
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-2xl border transition-all text-left',
                  theme.fontPairing === f.value
                    ? 'border-gallery-gold/40 bg-gallery-gold/8'
                    : 'border-on-surface/8 hover:border-on-surface/20',
                )}
              >
                <span className="text-sm font-medium text-primary">{f.label}</span>
                <span className="text-xs text-on-surface/30" aria-hidden="true">
                  {f.sample}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Colour presets */}
        <div>
          <p className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase mb-3">
            Colour preset
          </p>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setTheme({ backgroundColor: p.bg, textColor: p.text, accentColor: p.accent })}
                aria-label={`Apply ${p.label} preset`}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all',
                  theme.backgroundColor === p.bg
                    ? 'border-gallery-gold/50'
                    : 'border-on-surface/8 hover:border-on-surface/20',
                )}
              >
                <div className="flex gap-0.5">
                  <div className="w-3.5 h-3.5 rounded-full border border-on-surface/10" style={{ background: p.bg }} />
                  <div className="w-3.5 h-3.5 rounded-full border border-on-surface/10" style={{ background: p.text }} />
                  <div className="w-3.5 h-3.5 rounded-full border border-on-surface/10" style={{ background: p.accent }} />
                </div>
                <span className="text-[11px] text-on-surface/60">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom colours */}
        <div>
          <p className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase mb-3">
            Custom colours
          </p>
          <div className="space-y-3">
            <ColorSwatch label="Background" color={theme.backgroundColor} onChange={(v) => setTheme({ backgroundColor: v })} />
            <ColorSwatch label="Text" color={theme.textColor} onChange={(v) => setTheme({ textColor: v })} />
            <ColorSwatch label="Accent" color={theme.accentColor} onChange={(v) => setTheme({ accentColor: v })} />
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="flex flex-col gap-3">
        <p className="text-lg font-semibold tracking-tight text-primary">Preview</p>
        <div
          className="rounded-2xl overflow-hidden flex-1 min-h-48 p-6 flex flex-col gap-4 transition-colors duration-500"
          style={{
            background: theme.backgroundColor,
            color: theme.textColor,
          }}
          aria-label="Portfolio theme preview"
          role="presentation"
        >
          {/* Mock header */}
          <div className="space-y-3">
            <div
              className="text-[9px] uppercase tracking-[0.4em] opacity-40"
              style={{ color: theme.accentColor }}
            >
              {state.name || 'portfolio-slug'}
            </div>
            <div
              className="text-2xl font-semibold leading-tight"
              style={{
                fontFamily:
                  theme.fontPairing === 'tech-mono'
                    ? "'IBM Plex Mono', monospace"
                    : theme.fontPairing === 'classic-serif'
                      ? "'Georgia', serif"
                      : "'Inter', sans-serif",
              }}
            >
              {state.title || 'Portfolio Title'}
            </div>
            {state.subtitle && (
              <div className="text-xs uppercase tracking-widest opacity-50">
                {state.subtitle}
              </div>
            )}
          </div>
          {/* Mock grid blocks */}
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded"
                style={{ background: `${theme.accentColor}15` }}
              />
            ))}
          </div>
          {/* Mock footer */}
          <div className="mt-auto text-[8px] uppercase tracking-[0.3em] opacity-20">
            Framehouse Hub
          </div>
        </div>
      </div>

      {/* Layout density */}
      <div className="lg:col-span-2">
        <p className="font-rubik text-[9px] tracking-[0.2em] text-on-surface/40 uppercase mb-3">
          Layout density
        </p>
        <div className="flex gap-2">
          {DENSITY_OPTIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => {/* density stored in first grid block spacing when saving */}}
              className="flex-1 py-2.5 text-xs rounded-xl border border-on-surface/8 hover:border-gallery-gold/30 text-on-surface/50 hover:text-primary transition-all"
              aria-label={d.label}
            >
              {d.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-on-surface/25 mt-1.5">
          Controls spacing between grid rows. Does not affect asset order.
        </p>
      </div>
    </div>
  )
}
