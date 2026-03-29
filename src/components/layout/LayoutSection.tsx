import React from 'react'
import { cn } from '@/utilities/cn'

interface LayoutSectionProps {
  children: React.ReactNode
  className?: string
  id?: string
  bleed?: boolean
}

/**
 * LayoutSection: The source of truth for vertical rhythm.
 * Implements the standard 96px (py-24) gap defined in layout_system_spec.md
 */
export const LayoutSection = React.forwardRef<HTMLDivElement, LayoutSectionProps>(
  ({ children, className, id, bleed = false }, ref) => {
    return (
      <section 
        id={id}
        ref={ref}
        className={cn(
          "relative w-full",
          !bleed && "py-16 md:py-24 lg:py-32", // GALLERY_REF: Universal Vertical Rhythm
          className
        )}
      >
        {children}
      </section>
    )
  }
)

LayoutSection.displayName = 'LayoutSection'
