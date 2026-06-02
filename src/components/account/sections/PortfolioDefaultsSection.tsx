'use client'

import React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Info } from 'lucide-react'
import { cn } from '@/utilities/cn'

const THEME_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

const VISIBILITY_OPTIONS = [
  { label: 'Private', value: 'private' },
  { label: 'Password', value: 'password' },
  { label: 'Public', value: 'public' },
]

function SegmentedControl({
  name,
  options,
}: {
  name: string
  options: { label: string; value: string }[]
}) {
  const { control } = useFormContext()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div
          role="radiogroup"
          className="flex rounded-2xl bg-on-surface/5 dark:bg-white/5 p-1 gap-1"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={field.value === opt.value}
              onClick={() => field.onChange(opt.value)}
              className={cn(
                'flex-1 py-2.5 px-3 min-h-[44px] rounded-xl text-sm font-medium transition-all duration-200',
                field.value === opt.value
                  ? 'bg-white dark:bg-white/10 text-on-surface shadow-sm'
                  : 'text-on-surface/40 hover:text-on-surface/70',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    />
  )
}

export const PortfolioDefaultsSection: React.FC = () => {
  return (
    <section id="defaults" className="space-y-6 scroll-mt-[148px] lg:scroll-mt-8">
      <div>
        <h2 className="text-lg font-semibold text-on-surface">Global Portfolio Defaults</h2>
        <p className="mt-1 text-sm text-on-surface/50">
          Applied when you create a new portfolio.
        </p>
      </div>

      <div className="bg-gallery-surface/60 rounded-2xl p-4 sm:p-6 space-y-5 sm:space-y-6 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
        {/* Theme */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface">Default Theme</label>
          <SegmentedControl name="portfolioDefaults.defaultTheme" options={THEME_OPTIONS} />
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-on-surface">Default Visibility</label>
          <SegmentedControl
            name="portfolioDefaults.defaultVisibility"
            options={VISIBILITY_OPTIONS}
          />
        </div>

        {/* Watermark */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-on-surface">Show Watermark</p>
            <p className="text-xs text-on-surface/40">Apply studio watermark to shared images</p>
          </div>
          <Controller
            name="portfolioDefaults.showWatermark"
            render={({ field }) => (
              <button
                type="button"
                role="switch"
                aria-checked={!!field.value}
                onClick={() => field.onChange(!field.value)}
                className={cn(
                  'w-12 h-7 rounded-full transition-colors duration-200 relative shrink-0 touch-manipulation',
                  field.value
                    ? 'bg-gallery-gold'
                    : 'bg-on-surface/15 dark:bg-white/15',
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                    field.value ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            )}
          />
        </div>

        {/* Disclaimer — EC5 */}
        <div className="flex gap-3 bg-on-surface/[0.04] dark:bg-white/[0.04] rounded-2xl px-4 py-3">
          <Info size={15} className="text-on-surface/40 shrink-0 mt-0.5" />
          <p className="text-xs text-on-surface/50 leading-relaxed">
            Global defaults apply to <strong className="text-on-surface/70">newly created portfolios only</strong>.
            Existing active links maintain their specific custom configurations unless updated
            manually in the Portfolio Hub.
          </p>
        </div>
      </div>
    </section>
  )
}
