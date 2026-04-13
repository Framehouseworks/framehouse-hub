import React from 'react'
import { SprocketDivider as SprocketDividerComponent } from '@/components/SprocketDivider'
import { cn } from '@/utilities/cn'

export type SprocketDividerBlockProps = {
  backgroundColor?: 'white' | 'surface_low'
  speed?: 'slow' | 'medium' | 'fast'
}

export const SprocketDividerBlock: React.FC<SprocketDividerBlockProps> = ({ backgroundColor = 'white', speed = 'medium' }) => {
  const bgClasses = {
    white: 'bg-white dark:bg-[#1a1c1c]',
    surface_low: 'bg-[#f3f3f4] dark:bg-[#252828]',
  }

  return (
    <div className={cn(bgClasses[backgroundColor])}>
      <SprocketDividerComponent speed={speed} />
    </div>
  )
}
