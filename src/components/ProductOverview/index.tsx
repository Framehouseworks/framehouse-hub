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
        "absolute top-[25px] -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-white shadow-xl backdrop-blur-md border border-white/20 z-50 transition-colors bg-opacity-90",
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

  // Timing Constants (Frame-Perfect Sync Mapping)
  const T_HORIZ_A = [0, 0.08]
  const T_HORIZ_B = [0.08, 0.15]
  const T_PARA = [0.15, 0.4]
  const T_TRUNK_FULL = [0.22, 0.4, 0.92] 
  const T_PULSE_FULL = [0.4, 0.45] // Fade in period
  const T_PULSE_MOTION = [0.4, 0.95]
  const T_TAGLINE = [0.95, 1.0]

  // Segment Opacity to prevent "Initial Dots"
  const horizA_Opacity = useTransform(smoothProgress, [0, 0.01], [0, 1])
  const horizB_Opacity = useTransform(smoothProgress, [0.08, 0.09], [0, 1])
  const parabolicOpacity = useTransform(smoothProgress, [0.15, 0.16], [0, 1])
  const trunkOpacity = useTransform(smoothProgress, [0.21, 0.22], [0, 1])

  const horizA = useTransform(smoothProgress, T_HORIZ_A, [0, 1])
  const horizB = useTransform(smoothProgress, T_HORIZ_B, [0, 1])
  const parabolicProgress = useTransform(smoothProgress, T_PARA, [0, 1])
  
  // Multi-segment Trunk Mapping: Hits y=350 exactly as smoothProgress hits 0.4
  // Calculated: (350-200)/550 = 0.2727
  const trunkProgress = useTransform(smoothProgress, T_TRUNK_FULL, [0, 0.2727, 1])
  
  // Pulse Journey: Radius-safe end at y=534 (total 734) within the 550 trunk container
  const pulseOpacity = useTransform(smoothProgress, [0.4, 0.45], [0, 1])
  const pulseY = useTransform(smoothProgress, T_PULSE_MOTION, [0, 534])
  
  const taglineOpacity = useTransform(smoothProgress, T_TAGLINE, [0, 1])

  // Unified Styling Consistent across all components
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
        
        {/* Step Diagram Container */}
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
            {/* Full-Width Hint Baseline */}
            <motion.path
              d="M 0 25 L 1000 25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="6 6"
              className="text-muted-foreground/10"
            />

            {/* Branded Horizontal Connectors (Precision Edge Anchors) */}
            <motion.path
              d="M 100 25 L 450 25"
              stroke="#bb1800"
              strokeWidth={strokeW}
              className="drop-shadow-[0_0_8px_#bb1800]"
              style={{ pathLength: horizA, opacity: horizA_Opacity }}
            />
            <motion.path
              d="M 550 25 L 900 25"
              stroke="#00a2ff"
              strokeWidth={strokeW}
              className="drop-shadow-[0_0_8px_#00a2ff]"
              style={{ pathLength: horizB, opacity: horizB_Opacity }}
            />

            {/* Parabolic Paths (Staggered Convergence Sync) */}
            
            {/* Outer Arcs (Converge at y=350) */}
            <motion.path
              d="M 100 25 Q 350 25, 500 350"
              stroke="#bb1800"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="drop-shadow-[0_0_12px_#bb1800]"
              style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
            />
            <motion.path
              d="M 900 25 Q 650 25, 500 350"
              stroke="#00a2ff"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="drop-shadow-[0_0_12px_#00a2ff]"
              style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
            />

            {/* Inner Arcs (Converge at y=200) */}
            <motion.path
              d="M 100 25 Q 500 25, 500 200"
              stroke="#bb1800"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="drop-shadow-[0_0_12px_#bb1800]"
              style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
            />
            <motion.path
              d="M 900 25 Q 500 25, 500 200"
              stroke="#00a2ff"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="drop-shadow-[0_0_12px_#00a2ff]"
              style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
            />

            {/* Center Path (Converge at y=200) */}
            <motion.path
              d="M 500 25 L 500 200"
              stroke="currentColor"
              strokeWidth={strokeW}
              strokeLinecap="round"
              className="text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.5)] dark:drop-shadow-[0_0_15px_rgba(187,24,0,0.4)]"
              style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
            />

            {/* Central Trunk Line (Precision Backbone) */}
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

          {/* Traveling Pulse (Glow Circle) - Persistent Radius-Safe Conclusion */}
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
