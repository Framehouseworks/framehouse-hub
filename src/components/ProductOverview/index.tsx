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
        "absolute top-0 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-white shadow-xl backdrop-blur-md border border-white/20 z-50",
        color
      )}
    >
      {label}
    </motion.div>
  )
}

export const ProductOverview = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Center-to-Center: 0 when start hits 50%, 1 when end hits 50%
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.5", "end 0.5"]
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 30,
    restDelta: 0.001
  })

  // Animation Timings (Scaled to complete by progress 0.5 - when centered)
  // 0.0 - 0.1: Horizontal Connectors
  // 0.1 - 0.25: Parabolic Paths (Drawing to convergence)
  // 0.25: Trunk Reveal
  // 0.25 - 0.5: Pulse Travel (Completing exactly as centered)
  // 0.5 - 0.7: Tagline Reveal
  
  const horizontalProgress = useTransform(smoothProgress, [0, 0.1], [0, 1])
  const parabolicProgress = useTransform(smoothProgress, [0.1, 0.25], [0, 1])
  const trunkProgress = useTransform(smoothProgress, [0.25, 0.95], [0, 1])
  const trunkOpacity = useTransform(smoothProgress, [0.24, 0.25], [0, 1])
  
  const pulseOpacity = useTransform(smoothProgress, [0.25, 0.3, 0.95, 1.0], [0, 1, 1, 0])
  
  // Pulse Y translation mapping to the central trunk height (y=180 to y=380 in SVG scale)
  // We'll use a relative percentage within its absolute container
  const pulseY = useTransform(smoothProgress, [0.25, 0.95], ["0%", "100%"])
  
  const taglineOpacity = useTransform(smoothProgress, [0.45, 0.55], [0, 1])

  return (
    <section 
      ref={containerRef}
      className="relative w-full h-[70vh] md:h-[60vh] flex flex-col items-center justify-center overflow-hidden bg-background py-20"
    >
      {/* Header Content */}
      <div className="absolute top-12 text-center px-4 z-20">
        <h2 className="text-xl md:text-2xl font-mono text-transparent bg-clip-text bg-gradient-to-b from-[#bb1800] to-foreground uppercase tracing-tighter leading-none mb-2">
          Meet the lifecycle of your media
        </h2>
      </div>

      <div className="container relative z-10 w-full max-w-5xl h-full flex flex-col items-center justify-center">
        
        {/* Step Diagram Container */}
        <div className="relative w-full h-80 max-w-4xl mt-16 mb-8">
          
          {/* Pills */}
          <StepTag label="Upload" color="bg-[#bb1800]" progress={smoothProgress} threshold={0.05} xPosition="15%" />
          <StepTag label="Organise" color="bg-[#14192A]" progress={smoothProgress} threshold={0.1} xPosition="50%" />
          <StepTag label="Share" color="bg-[#00a2ff]" progress={smoothProgress} threshold={0.15} xPosition="85%" />

          {/* SVG Diagram Layer */}
          <svg 
            viewBox="0 0 1000 400" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Horizontal Connectors */}
            <motion.path
              d="M 150 25 L 850 25"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
              className="text-muted-foreground/20"
            />
            <motion.path
              d="M 150 25 L 500 25"
              stroke="#bb1800"
              strokeWidth="2"
              className="drop-shadow-[0_0_8px_#bb1800]"
              style={{ pathLength: useTransform(horizontalProgress, [0, 0.5], [0, 1]) }}
            />
            <motion.path
              d="M 500 25 L 850 25"
              stroke="#00a2ff"
              strokeWidth="2"
              className="drop-shadow-[0_0_8px_#00a2ff]"
              style={{ pathLength: useTransform(horizontalProgress, [0.5, 1], [0, 1]) }}
            />

            {/* Parabolic Paths (Inward Curves - Doubled) */}
            {/* Left Side */}
            <motion.path
              d="M 80 25 Q 500 25, 500 180"
              stroke="#bb1800"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="opacity-30 drop-shadow-[0_0_8px_#bb1800]"
              style={{ pathLength: parabolicProgress }}
            />
            <motion.path
              d="M 150 25 Q 500 25, 500 180"
              stroke="#bb1800"
              strokeWidth="2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_10px_#bb1800]"
              style={{ pathLength: parabolicProgress }}
            />

            {/* Center Path */}
            <motion.path
              d="M 500 25 L 500 180"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-muted-foreground/40 drop-shadow-[0_0_10px_currentColor]"
              style={{ pathLength: parabolicProgress }}
            />

            {/* Right Side */}
            <motion.path
              d="M 850 25 Q 500 25, 500 180"
              stroke="#00a2ff"
              strokeWidth="2"
              strokeLinecap="round"
              className="drop-shadow-[0_0_10px_#00a2ff]"
              style={{ pathLength: parabolicProgress }}
            />
            <motion.path
              d="M 920 25 Q 500 25, 500 180"
              stroke="#00a2ff"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="opacity-30 drop-shadow-[0_0_8px_#00a2ff]"
              style={{ pathLength: parabolicProgress }}
            />

            {/* Central Trunk Line */}
            <motion.path
              d="M 500 180 L 500 380"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-foreground drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] dark:drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
              style={{ 
                pathLength: trunkProgress,
                opacity: trunkOpacity 
              }}
            />
          </svg>

          {/* Traveling Pulse (Glow Circle) - Fixed positioning inside relative container */}
          <div className="absolute top-[180px] left-1/2 -translate-x-1/2 w-4 h-[200px] pointer-events-none z-[60]">
             <motion.div 
               style={{ 
                 opacity: pulseOpacity, 
                 y: pulseY,
                 willChange: 'transform, opacity'
               }}
               className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white
                          shadow-[0_0_20px_rgba(255,255,255,1),0_0_40px_#bb1800]
                          dark:shadow-[0_0_30px_#bb1800,0_0_60px_rgba(187,24,0,0.6)]"
             />
          </div>
        </div>

        {/* Final Tagline */}
        <motion.div 
          style={{ opacity: taglineOpacity }}
          className="text-center px-4 mt-8"
        >
          <p className="text-sm md:text-lg text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Framehouse Hub powers the world&apos;s most ambitious creative teams, <br className="hidden md:block" />
            from independent studios to global production houses.
          </p>
        </motion.div>
      </div>

      {/* Lighting Backdrop */}
      <div className="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.1] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[radial-gradient(circle,rgba(187,24,0,0.1)_0%,rgba(0,162,255,0.05)_50%,transparent_100%)] blur-[100px]" />
      </div>
    </section>
  )
}
