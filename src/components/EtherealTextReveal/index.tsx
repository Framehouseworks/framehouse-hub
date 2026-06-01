'use client'

import { cn } from '@/utilities/cn'
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { useRef } from 'react'

interface WordProps {
  children: string
  progress: MotionValue<number>
  range: [number, number]
  glowColor?: string
  glowIntensity?: number
  baseOpacity?: number
}

const Word = ({
  children,
  progress,
  range,
  glowColor = '#bb1800',
  glowIntensity = 16,
  baseOpacity = 0.1,
}: WordProps) => {
  const delta = (range[1] - range[0]) * 0.8

  const revealOpacity = useTransform(
    progress,
    [range[0] - delta, range[0], range[1], range[1] + delta],
    [0, 1, 1, 1],
  )

  const glowOpacity = useTransform(
    progress,
    [range[0] - delta, range[0], (range[0] + range[1]) / 2, range[1], range[1] + delta],
    [0, 0.5, 0.5, 0, 0],
  )

  const y = useTransform(progress, range, [2, 0])
  const scale = useTransform(
    progress,
    [range[0] - delta, (range[0] + range[1]) / 2, range[1] + delta],
    [0.99, 1.02, 1],
  )

  return (
    <span className="relative inline-block mr-[0.25em] last:mr-0">
      {/* Ghost layer */}
      <span
        className="select-none text-foreground dark:text-white font-medium"
        style={{ opacity: baseOpacity }}
        aria-hidden="true"
      >
        {children}
      </span>

      {/* Backdrop glow */}
      <motion.span
        style={{
          opacity: glowOpacity,
          filter: `blur(${glowIntensity * 1.2}px)`,
          background: glowColor,
        }}
        className="absolute inset-0 rounded-full select-none pointer-events-none -z-20 will-change-[opacity]"
        aria-hidden="true"
      />

      {/* Revealed text */}
      <motion.span
        style={{ opacity: revealOpacity, y, scale }}
        transition={{ ease: [0.23, 1, 0.32, 1] }}
        className="absolute inset-0 inline-block text-foreground dark:text-white font-medium will-change-[opacity,transform]"
      >
        {children}
      </motion.span>

      {/* Coloured glow text pulse */}
      <motion.span
        style={{ opacity: glowOpacity, color: glowColor, y, scale }}
        className="absolute inset-0 inline-block font-medium filter blur-[2px] pointer-events-none"
        aria-hidden="true"
      >
        {children}
      </motion.span>
    </span>
  )
}

interface EtherealTextRevealProps {
  text: string
  className?: string
  viewportOffset?: [string, string]
  align?: 'start' | 'center' | 'end'
  baseOpacity?: number
  glowColor?: string
  glowIntensity?: number
}

export const EtherealTextReveal = ({
  text,
  className,
  viewportOffset = ['start 90%', 'center center'],
  align = 'center',
  baseOpacity = 0.1,
  glowColor = '#bb1800',
  glowIntensity = 16,
}: EtherealTextRevealProps) => {
  const targetRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: targetRef,
    // @ts-expect-error framer-motion offset typing is overly restrictive for string tuples
    offset: viewportOffset as [string, string],
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 25,
    mass: 0.5,
  })

  const words = text.split(' ')

  return (
    <div ref={targetRef} className={cn('relative leading-tight py-12', className)}>
      <div
        className={cn(
          'flex flex-wrap items-center',
          align === 'center' && 'justify-center',
          align === 'start'  && 'justify-start',
          align === 'end'    && 'justify-end',
        )}
      >
        {words.map((word, i) => {
          const total = words.length
          const start = i / total
          const end = (i + 1) / total

          return (
            <Word
              key={i}
              progress={smoothProgress}
              range={[start, end]}
              glowColor={glowColor}
              glowIntensity={glowIntensity}
              baseOpacity={baseOpacity}
            >
              {word}
            </Word>
          )
        })}
      </div>
    </div>
  )
}
