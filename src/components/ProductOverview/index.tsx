'use client'

import { cn } from '@/utilities/cn'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { EtherealTextReveal } from '../EtherealTextReveal'

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

  return (
    <motion.div
      style={{ opacity, left: xPosition }}
      className={cn(
        "absolute top-[25px] -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-white shadow-xl backdrop-blur-md border border-white/20 z-50 transition-colors bg-opacity-90 min-w-[100px] text-center",
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

  // Timing Constants (Defect-Corrected Sequencing)
  const T_PILL_UPLOAD = 0.05
  const T_PILL_ORGANISE = 0.10
  const T_PILL_SHARE = 0.15

  const T_HORIZ_A = [0, 0.08]
  const T_HORIZ_B = [0.08, 0.15]
  const T_PARA = [0.15, 0.4]
  const T_TRUNK_FULL = [0.2, 0.85]
  const T_PULSE_MOTION = [0.4, 0.9]
  const T_TAGLINE = [0.9, 1.0]

  const horizA = useTransform(smoothProgress, T_HORIZ_A, [0, 1])
  const horizA_Opacity = useTransform(smoothProgress, [0, 0.01], [0, 1])

  const horizB = useTransform(smoothProgress, T_HORIZ_B, [0, 1])
  const horizB_Opacity = useTransform(smoothProgress, [0.08, 0.09], [0, 1])

  const parabolicProgress = useTransform(smoothProgress, T_PARA, [0, 1])
  const parabolicOpacity = useTransform(smoothProgress, [0.15, 0.16], [0, 1])

  const trunkProgress = useTransform(smoothProgress, T_TRUNK_FULL, [0, 1])
  const trunkOpacity = useTransform(smoothProgress, [0.19, 0.2], [0, 1])

  // Pulse Journey: Radius-safe end at y=262 relative to start at y=180 (total y=442). 
  // Trunk is y=180 to y=450 (total 270px). Safety buffer of 8px.
  const pulseOpacity = useTransform(smoothProgress, [0.4, 0.45], [0, 1])
  const pulseY = useTransform(smoothProgress, T_PULSE_MOTION, [0, 262])

  const taglineOpacity = useTransform(smoothProgress, T_TAGLINE, [0, 1])

  // Unified Styling
  const strokeW = 2.5

  return (
    <section
      ref={containerRef}
      className="container w-full min-h-[100vh] flex flex-col items-center justify-start bg-background py-16 md:py-24"
    >
      {/* Header Content */}
      <div className="text-center px-4 z-20 mb-8 md:mb-12">
        <h2 className="text-2xl md:text-3xl font-mono text-transparent bg-clip-text bg-gradient-to-b from-[#F13C1F] via-[#F13C1F] via-40% to-transparent uppercase tracing-tighter leading-none mb-4">
          Meet the lifecycle of your media
        </h2>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center justify-start flex-grow h-full">

        {/* Step Diagram Container - Vertically Compressed for Viewport Compatibility */}
        <div className=" w-full h-[350px] md:h-[500px]">

          {/* Minimalist Pills */}
          <StepTag label="Upload" color="bg-[#bb1800]" progress={smoothProgress} threshold={T_PILL_UPLOAD} xPosition="5%" />
          <StepTag label="Organise" color="bg-[#14192A]" progress={smoothProgress} threshold={T_PILL_ORGANISE} xPosition="50%" />
          <StepTag label="Share" color="bg-[#445aa5]" progress={smoothProgress} threshold={T_PILL_SHARE} xPosition="95%" />

          {/* SVG Diagram Layer */}
          <svg
            viewBox="0 0 1000 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full overflow-visible"
            preserveAspectRatio="xMidYMin meet"
          >
            {/* SVG Filters with userSpaceOnUse to resolve Invisibility Defects */}
            <defs>
              <filter id="glow-red-down" filterUnits="userSpaceOnUse" x="0" y="0" width="1000" height="800">
                <feDropShadow dx="0" dy="15" stdDeviation="10" floodColor="#bb1800" floodOpacity="0.5" />
              </filter>
              <filter id="glow-blue-down" filterUnits="userSpaceOnUse" x="0" y="0" width="1000" height="800">
                <feDropShadow dx="0" dy="15" stdDeviation="10" floodColor="#445aa5" floodOpacity="0.5" />
              </filter>
              <filter id="glow-neutral-down" filterUnits="userSpaceOnUse" x="0" y="0" width="1000" height="800">
                <feDropShadow dx="0" dy="15" stdDeviation="8" floodColor="currentColor" floodOpacity="0.2" />
              </filter>

              {/* Mask to ensure "Downward Only" shadow cutoff */}
              <mask id="bottom-mask">
                <rect x="0" y="25" width="1000" height="800" fill="white" />
              </mask>
            </defs>

            {/* Edge-to-Edge Divider Baseline */}
            <motion.path
              d="M 0 25 L 1000 25"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              className="text-muted-foreground/20"
            />

            {/* Arcs and Trunks - Explicit Color Mapping for Contrast */}
            <g mask="url(#bottom-mask)">
              {/* Horizontal Connectors */}
              <motion.path
                d="M 100 25 L 450 25"
                stroke="#bb1800"
                strokeWidth={strokeW}
                filter="url(#glow-red-down)"
                style={{ pathLength: horizA, opacity: horizA_Opacity }}
              />
              <motion.path
                d="M 550 25 L 900 25"
                stroke="#445aa5"
                strokeWidth={strokeW}
                filter="url(#glow-blue-down)"
                style={{ pathLength: horizB, opacity: horizB_Opacity }}
              />

              {/* 7-Path Gallery Fan */}
              {/* Outer Arcs */}
              <motion.path
                d="M 50 25 Q 250 25, 500 420"
                stroke="#bb1800"
                strokeWidth={strokeW}
                strokeLinecap="round"
                filter="url(#glow-red-down)"
                style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
              />
              <motion.path
                d="M 950 25 Q 750 25, 500 420"
                stroke="#445aa5"
                strokeWidth={strokeW}
                strokeLinecap="round"
                filter="url(#glow-blue-down)"
                style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
              />

              {/* Middle Arcs */}
              <motion.path
                d="M 200 25 Q 400 25, 500 300"
                stroke="#bb1800"
                strokeWidth={strokeW}
                strokeLinecap="round"
                filter="url(#glow-red-down)"
                style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
              />
              <motion.path
                d="M 800 25 Q 600 25, 500 300"
                stroke="#445aa5"
                strokeWidth={strokeW}
                strokeLinecap="round"
                filter="url(#glow-blue-down)"
                style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
              />

              {/* Inner Arcs */}
              <motion.path
                d="M 350 25 Q 500 25, 500 180"
                stroke="#bb1800"
                strokeWidth={strokeW}
                strokeLinecap="round"
                filter="url(#glow-red-down)"
                style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
              />
              <motion.path
                d="M 650 25 Q 500 25, 500 180"
                stroke="#445aa5"
                strokeWidth={strokeW}
                strokeLinecap="round"
                filter="url(#glow-blue-down)"
                style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
              />

              {/* Center Connect */}
              <motion.path
                d="M 500 25 L 500 180"
                stroke="currentColor"
                strokeWidth={strokeW}
                strokeLinecap="round"
                filter="url(#glow-neutral-down)"
                className="text-foreground"
                style={{ pathLength: parabolicProgress, opacity: parabolicOpacity }}
              />

              {/* Fluid Trunk Backbone */}
              <motion.path
                d="M 500 180 L 500 450"
                stroke="currentColor"
                strokeWidth={strokeW}
                strokeLinecap="round"
                filter="url(#glow-neutral-down)"
                className="text-foreground"
                style={{
                  pathLength: trunkProgress,
                  opacity: trunkOpacity
                }}
              />
            </g>
          </svg>

          {/* Traveling Pulse (Glow Circle) - Persistent Radius-Safe Destination */}
          <div className="absolute top-[180px] left-1/2 -translate-x-1/2 w-4 h-[270px] pointer-events-none z-[60]">
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

        <EtherealTextReveal
          text="Framehouse Hub powers the world's most ambitious creative teams, from independent studios to global production houses."
          className="text-xl md:text-4xl font-light leading-relaxed mt-8 md:mt-12 pb-8"
        />
      </div>

      {/* Lighting Backdrop */}
      <div className="absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.1] pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-[radial-gradient(circle,rgba(187,24,0,0.1)_0%,rgba(0,162,255,0.05)_50%,transparent_100%)] blur-[120px]" />
      </div>
    </section>
  )
}
