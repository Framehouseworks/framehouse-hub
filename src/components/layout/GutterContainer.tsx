import React from 'react'
import { cn } from '@/utilities/cn'

interface GutterContainerProps {
  children: React.ReactNode
  className?: string
  leftAlign?: boolean
}

/**
 * GutterContainer: The source of truth for horizontal alignment.
 * Implements the responsive horizontal "spines" defined in layout_system_spec.md
 */
export const GutterContainer: React.FC<GutterContainerProps> = ({ 
  children, 
  className,
  leftAlign = false 
}) => {
  return (
    <div 
      className={cn(
        "w-full px-6 sm:px-12 lg:px-24", // GALLERY_REF: Global Horizontal Spines
        !leftAlign && "max-w-7xl mx-auto", // GALLERY_REF: Standard 1280px Max-Width
        className
      )}
    >
      {children}
    </div>
  )
}
