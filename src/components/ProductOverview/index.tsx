'use client'

import React, { useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { cn } from '@/utilities/cn'

const StepTag = ({ 
  label, 
  color, 
  progress,
  threshold,
  xPosition
}: { 
  label: string, 
  color: string, 
  progress: any,
  threshold: number,
  xPosition: string
}) => {
  const opacity = useTransform(progress, [threshold - 0.05, threshold], [0, 1])
  const scale = useTransform(progress, [threshold - 0.05, threshold], [0.8, 1])

  return (
    <motion.div 
      style={{ opacity, scale, left: xPosition }}
      className={cn(
        "absolute top-0 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-white shadow-xl backdrop-blur-md border border-white/20 z-50 transition-colors",
        color
      )}
    >
      {label}
    </motion.div>
  )
}

export const ProductOverview = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Center-to-Center Scroll logic: 0 when start hits 50%, 1 when end hits 50%
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.5", "end 0.5"]
  })

  // Smoothspring for fluid motion
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 60,
    damping: 25,
    restDelta: 0.001
  })

  // Timing Constants (Completing exactly at 1.0 - when tagline is fully displayed)
  const T_START_HORIZ = 0
  const T_END_HORIZ = 0.1
  const T_START_PARA = 0.1
  const T_END_PARA = 0.35
  const T_START_TRUNK = 0.35
  const T_END_TRUNK = 0.95
  const T_START_TAGLINE = 0.9
  const T_END_TAGLINE = 1.0

  const horizontalProgress = useTransform(smoothProgress, [T_START_HORIZ, T_END_HORIZ], [0, 1])
  const parabolicProgress = useTransform(smoothProgress, [T_START_PARA, T_END_PARA], [0, 1])
  const trunkProgress = useTransform(smoothProgress, [T_START_TRUNK, T_END_TRUNK], [0, 1])
  const trunkOpacity = useTransform(smoothProgress, [T_START_TRUNK - 0.01, T_START_TRUNK], [0, 1])
  
  const pulseOpacity = useTransform(smoothProgress, [T_START_TRUNK, T_START_TRUNK + 0.05, T_END_TRUNK, T_END_TAGLINE], [0, 1, 1, 0])
  const pulseY = useTransform(smoothProgress, [T_START_TRUNK, T_END_TRUNK], ["0%", "100%"])
  
  const taglineOpacity = useTransform(smoothProgress, [T_START_TAGLINE, T_END_TAGLINE], [0, 1])

  // Unified Styling
  const strokeW = 2.5

  return (
    <section 
      ref={containerRef}
      className="relative w-full h-[100vh] flex flex-col items-center justify-start overflow-hidden bg-background py-24"
    >
      {/* Header Content */}
      <div className="text-center px-4 z-20 mb-20">
        <h2 className="text-2xl md:text-3xl font-mono text-transparent bg-clip-text bg-gradient-to-b from-[#bb1800] to-foreground uppercase tracing-tighter leading-none mb-4">
          Meet the lifecycle of your media
        </h2>
      </div>

      <div className="container relative z-10 w-full max-w-[1400px] flex flex-col items-center justify-start flex-grow">
        
        {/* Step Diagram Container - Height matches viewBox aspect ratio */}
        <div className="relative w-full h-[600px] md:h-[800px]">
          
          {/* Pills (Expansive Distribution) */}
          <StepTag label="Upload" color="bg-[#bb1800]" progress={smoothProgress} threshold={0.05} xPosition="5%" />
          <StepTag label="Organise" color="bg-[#14192A]" progress={smoothProgress} threshold={0.1} xPosition="50%" />
          <StepTag label="Share" color="bg-[#00a2ff]" progress={smoothProgress} threshold={0.15} xPosition="95%" />

          {/* SVG Diagram Layer */}
          <svg 
            viewBox="0 0 1000 800" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="xMidYMin meet"
          >
            {/* Full-Width Horizontal Connector */}
            <motion.path
              d="M 0 25 L 1000 25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              className="text-muted-foreground/20"
            />
            <motion.path
              d="M 0 25 L 1000 25"
              stroke="currentColor"
              strokeWidth={strokeW}
              className="text-muted-foreground/40 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
              style={{ pathLength: horizontalProgress }}
            />

            {/* Parabolic Paths (Staggered Convergence) */}
            
            {/* Outer Arcs (Converge at y=350) */}
            <motion.path
              d="M 50 25 Q 350 25, 500 350"
              stroke="#bb1800"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="drop-shadow-[0_0_12px_#bb1800]"
              style={{ pathLength: parabolicProgress }}
            />
            <motion.path
              d="M 950 25 Q 650 25, 500 350"
              stroke="#00a2ff"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="drop-shadow-[0_0_12px_#00a2ff]"
              style={{ pathLength: parabolicProgress }}
            />

            {/* Inner Arcs (Converge at y=200) */}
            <motion.path
              d="M 150 25 Q 500 25, 500 200"
              stroke="#bb1800"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="drop-shadow-[0_0_12px_#bb1800]"
              style={{ pathLength: parabolicProgress }}
            />
            <motion.path
              d="M 850 25 Q 500 25, 500 200"
              stroke="#00a2ff"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="drop-shadow-[0_0_12px_#00a2ff]"
              style={{ pathLength: parabolicProgress }}
            />

            {/* Center Path (Converge at y=200) */}
            <motion.path
              d="M 500 25 L 500 200"
              stroke="currentColor"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] dark:drop-shadow-[0_0_15px_rgba(187,24,0,0.4)]"
              style={{ pathLength: parabolicProgress }}
            />

            {/* Central Trunk Line (Extended to base) */}
            <motion.path
              d="M 500 200 L 500 750"
              stroke="currentColor"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="text-foreground drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] dark:drop-shadow-[0_0_20px_rgba(187,24,0,0.6)]"
              style={{ 
                pathLength: trunkProgress,
                opacity: trunkOpacity 
              }}
            />
          </svg>

          {/* Traveling Pulse (Glow Circle) - Matches Trunk y=200 to y=750 */}
          <div className="absolute top-[200px] left-1/2 -translate-x-1/2 w-4 h-[550px] pointer-events-none z-[60]">
             <motion.div 
               style={{ 
                 opacity: pulseOpacity, 
                 y: pulseY,
                 willChange: 'transform, opacity'
               }}
               className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white
                          shadow-[0_0_20px_rgba(255,255,255,1),0_0_40px_#bb1800]
                          dark:shadow-[0_0_30px_#bb1800,0_0_60px_#bb1800]"
             />
          </div>
        </div>

        {/* Final Tagline Content */}
        <motion.div 
          style={{ opacity: taglineOpacity }}
          className="text-center px-4 mt-auto mb-20"
        >
          <p className="text-base md:text-xl text-muted-foreground font-medium max-w-3xl mx-auto leading-relaxed">
            Framehouse Hub powers the world&apos;s most ambitious creative teams, <br className="hidden md:block" />
            from independent studios to global production houses.
          </p>
        </motion.div>
      </div>

      {/* Lighting Backdrop */}
      <div className="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.1] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-[radial-gradient(circle,rgba(187,24,0,0.1)_0%,rgba(0,162,255,0.05)_50%,transparent_100%)] blur-[120px]" />
      </div>
    </section>
  )
}
