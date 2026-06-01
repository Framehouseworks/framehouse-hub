'use client'

import React from 'react'

import { GutterContainer } from '@/components/layout/GutterContainer'
import { LayoutSection } from '@/components/layout/LayoutSection'
import { cn } from '@/utilities/cn'

type WorkflowStep = {
  label: string
  description: string
}

export type ProductWorkflowProps = {
  heading: string
  steps: WorkflowStep[]
}

const STEP_COLORS = [
  { ring: 'bg-gallery-red/10', num: 'text-gallery-red' },
  { ring: 'bg-[#445aa5]/10', num: 'text-[#445aa5]' },
  { ring: 'bg-gallery-gold/10', num: 'text-gallery-gold' },
  { ring: 'bg-gallery-red/10', num: 'text-gallery-red' },
]

export const ProductWorkflow: React.FC<ProductWorkflowProps> = ({ heading, steps }) => {
  return (
    <LayoutSection className="bg-[#f3f3f4]">
      <GutterContainer>
        {/* Header */}
        <div className="mb-16 text-center md:mb-20">
          <p className="mb-5 font-rubik text-[10px] tracking-[0.4em] uppercase text-gallery-red">
            Workflow
          </p>
          <h2 className="mx-auto max-w-2xl text-3xl font-extralight tracking-tight text-foreground md:text-4xl lg:text-5xl">
            {heading}
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {steps.map((step, i) => {
            const color = STEP_COLORS[i % STEP_COLORS.length]

            return (
              <div key={i} className="relative flex flex-col">
                {/* Step number */}
                <div
                  className={cn(
                    'mb-6 flex h-10 w-10 items-center justify-center rounded-full',
                    color.ring,
                  )}
                >
                  <span className={cn('font-rubik text-xs font-bold', color.num)}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Connector — desktop only, between steps */}
                {i < steps.length - 1 && (
                  <div
                    className="absolute top-5 hidden h-px bg-foreground/10 lg:block"
                    style={{ left: '2.75rem', right: '-1.5rem' }}
                    aria-hidden
                  />
                )}

                <p className="mb-2 font-rubik text-[10px] tracking-[0.2em] uppercase text-foreground">
                  {step.label}
                </p>

                <p className="font-varela text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            )
          })}
        </div>
      </GutterContainer>
    </LayoutSection>
  )
}
