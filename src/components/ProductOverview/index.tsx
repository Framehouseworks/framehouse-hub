'use client'

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import React, { useRef } from 'react'

import { GutterContainer } from '@/components/layout/GutterContainer'
import { EtherealTextReveal } from '../EtherealTextReveal'

// ─── Animation timing ────────────────────────────────────────────────────────
// All thresholds [0..1]:
//   0 = section top at viewport top  (sticky just locked)
//   1 = section bottom at viewport top (sticky released, 150 vh scrolled)
// No spring — direct scroll coupling ensures the animation always finishes
// before the sticky block releases.
const T = {
  horizLeft:  { draw: [0.00, 0.10], show: [0.00, 0.03] },
  horizRight: { draw: [0.10, 0.20], show: [0.10, 0.13] },
  pills:      { upload: 0.05, organise: 0.14, share: 0.20 },
  // Trunk leads slightly so it's ready when arcs arrive
  trunk:      { draw: [0.15, 0.84], show: [0.13, 0.15] },
  arcs:       { draw: [0.20, 0.58], show: [0.20, 0.23] },
  pulse:      { travel: [0.58, 0.92], show: [0.58, 0.63] },
}

// ─── SVG layout constants ─────────────────────────────────────────────────────
const VB = { w: 1000, h: 500 }
// Pills centred at x=80 / 500 / 920 so rect edges clear the viewBox boundary
const P = { w: 126, h: 30, rx: 15, upload: 80, org: 500, share: 920, cy: 25 }
const SW = 2 // stroke-width

// ─── SVGPill — rect + label in SVG space, aligns precisely with paths ─────────
type SVGPillProps = { label: string; cx: number; fill: string; opacity: MotionValue<number> }

const SVGPill = ({ label, cx, fill, opacity }: SVGPillProps) => (
  <motion.g style={{ opacity }}>
    <rect x={cx - P.w / 2} y={P.cy - P.h / 2} width={P.w} height={P.h} rx={P.rx} fill={fill} />
    <text
      x={cx}
      y={P.cy}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="white"
      fontSize={11}
      letterSpacing={2.5}
      style={{ fontFamily: 'var(--font-rubik), monospace' }}
    >
      {label.toUpperCase()}
    </text>
  </motion.g>
)

// ─── Props ────────────────────────────────────────────────────────────────────
export type ProductOverviewProps = {
  heading?: string
  revealText?: string
  steps?: { upload: string; organise: string; share: string }
}

const DEFAULT_CONTENT: Required<ProductOverviewProps> = {
  heading: 'Meet the lifecycle of your media',
  revealText:
    "Framehouse Hub powers the world's most ambitious creative teams, from independent studios to global production houses.",
  steps: { upload: 'Upload', organise: 'Organise', share: 'Share' },
}

// ─── Component ────────────────────────────────────────────────────────────────
export const ProductOverview: React.FC<ProductOverviewProps> = (props) => {
  const {
    heading    = DEFAULT_CONTENT.heading,
    revealText = DEFAULT_CONTENT.revealText,
    steps      = DEFAULT_CONTENT.steps,
  } = props

  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  // Direct scrollYProgress — no spring. At scroll = 150 vh (container end),
  // progress = 1.0 and the last event (T.pulse[1] = 0.92) is already done.
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ['start start', 'end start'],
  })

  // All derived values at the top level — never inside child components.
  const horizLeftDraw  = useTransform(scrollYProgress, T.horizLeft.draw,  [0, 1])
  const horizLeftShow  = useTransform(scrollYProgress, T.horizLeft.show,  [0, 1])
  const horizRightDraw = useTransform(scrollYProgress, T.horizRight.draw, [0, 1])
  const horizRightShow = useTransform(scrollYProgress, T.horizRight.show, [0, 1])

  const pillUpload   = useTransform(scrollYProgress, [T.pills.upload - 0.04,   T.pills.upload],   [0, 1])
  const pillOrganise = useTransform(scrollYProgress, [T.pills.organise - 0.04, T.pills.organise], [0, 1])
  const pillShare    = useTransform(scrollYProgress, [T.pills.share - 0.04,    T.pills.share],    [0, 1])

  const trunkDraw = useTransform(scrollYProgress, T.trunk.draw, [0, 1])
  const trunkShow = useTransform(scrollYProgress, T.trunk.show, [0, 1])
  const arcsDraw  = useTransform(scrollYProgress, T.arcs.draw,  [0, 1])
  const arcsShow  = useTransform(scrollYProgress, T.arcs.show,  [0, 1])

  const pulseCY      = useTransform(scrollYProgress, T.pulse.travel, [P.cy, 445])
  const pulseOpacity = useTransform(scrollYProgress, T.pulse.show,   [0, 1])

  // Reduced-motion: static fully-drawn diagram from first render
  const staticPath = shouldReduceMotion ? { pathLength: 1, opacity: 1 } : undefined
  const arc = staticPath ?? { pathLength: arcsDraw, opacity: arcsShow }

  return (
    <div className="bg-background">
      {/*
        Outer container is 150 vh. Inner sticky pins the diagram while the user
        scrolls through the animation range, then releases naturally.
        150 vh × last event (0.92) = 138 vh — animation always completes
        before the sticky releases at 150 vh.
      */}
      <div ref={scrollRef} style={{ minHeight: '150vh' }}>
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden bg-background">

          {/* Ambient backdrop */}
          <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.05] dark:opacity-[0.1]" aria-hidden>
            <div className="absolute left-1/2 top-1/2 h-[90%] w-[90%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(187,24,0,0.1)_0%,rgba(0,162,255,0.05)_50%,transparent_100%)] blur-[120px]" />
          </div>

          <GutterContainer className="relative z-10 flex w-full flex-col items-center gap-6">
            {/* Section heading */}
            <h2 className="bg-gradient-to-b from-[#F13C1F] via-[#F13C1F] via-40% to-transparent bg-clip-text text-center font-mono text-2xl uppercase tracking-tighter leading-none text-transparent md:text-3xl">
              {heading}
            </h2>

            {/*
              SVG — visible at every viewport width.
              w-full lets the SVG fill the container horizontally.
              The viewBox aspect ratio (1000 × 500 = 2:1) drives natural height.
              preserveAspectRatio="xMidYMin meet" ensures no distortion.
              max-height guards against overflow on short/landscape viewports.
              Everything — pills, paths, pulse — lives in SVG space so they
              scale together at any width with no alignment code needed.
            */}
            <svg
              viewBox={`0 0 ${VB.w} ${VB.h}`}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMin meet"
              className="w-full"
              style={{ maxHeight: 'calc(100vh - 140px)' }}
              aria-label={`${heading}: ${steps.upload}, ${steps.organise}, ${steps.share}`}
            >
              <defs>
                <filter id="po-glow" x="-300%" y="-300%" width="700%" height="700%">
                  <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#bb1800" floodOpacity="0.85" />
                </filter>
              </defs>

              {/* Dashed horizon */}
              <path
                d={`M 0 ${P.cy} L ${VB.w} ${P.cy}`}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.15"
              />

              {/* Horizontal connectors */}
              <motion.path
                d={`M ${P.upload + P.w / 2} ${P.cy} L 450 ${P.cy}`}
                stroke="#bb1800" strokeWidth={SW}
                style={staticPath ?? { pathLength: horizLeftDraw, opacity: horizLeftShow }}
              />
              <motion.path
                d={`M 550 ${P.cy} L ${P.share - P.w / 2} ${P.cy}`}
                stroke="#445aa5" strokeWidth={SW}
                style={staticPath ?? { pathLength: horizRightDraw, opacity: horizRightShow }}
              />

              {/* Pills */}
              <SVGPill label={steps.upload}   cx={P.upload} fill="#bb1800" opacity={pillUpload}   />
              <SVGPill label={steps.organise} cx={P.org}    fill="#14192A" opacity={pillOrganise} />
              <SVGPill label={steps.share}    cx={P.share}  fill="#445aa5" opacity={pillShare}    />

              {/* Fan arcs — outer */}
              <motion.path d={`M ${P.upload} ${P.cy} Q 250 ${P.cy}, 500 420`} stroke="#bb1800" strokeWidth={SW} strokeLinecap="round" style={arc} />
              <motion.path d={`M ${P.share}  ${P.cy} Q 750 ${P.cy}, 500 420`} stroke="#445aa5" strokeWidth={SW} strokeLinecap="round" style={arc} />
              {/* Fan arcs — middle */}
              <motion.path d="M 200 25 Q 400 25, 500 300" stroke="#bb1800" strokeWidth={SW} strokeLinecap="round" style={arc} />
              <motion.path d="M 800 25 Q 600 25, 500 300" stroke="#445aa5" strokeWidth={SW} strokeLinecap="round" style={arc} />
              {/* Fan arcs — inner */}
              <motion.path d="M 350 25 Q 500 25, 500 180" stroke="#bb1800" strokeWidth={SW} strokeLinecap="round" style={arc} />
              <motion.path d="M 650 25 Q 500 25, 500 180" stroke="#445aa5" strokeWidth={SW} strokeLinecap="round" style={arc} />

              {/* Single continuous trunk — starts at baseline, no seam */}
              <motion.path
                d={`M 500 ${P.cy} L 500 450`}
                stroke="currentColor" strokeWidth={SW} strokeLinecap="round"
                style={staticPath ?? { pathLength: trunkDraw, opacity: trunkShow }}
              />

              {/* Traveling pulse — cx/cy in SVG space, zero alignment code */}
              {!shouldReduceMotion && (
                <motion.circle
                  cx={500} r={6} fill="white"
                  filter="url(#po-glow)"
                  cy={pulseCY}
                  style={{ opacity: pulseOpacity }}
                />
              )}
            </svg>
          </GutterContainer>
        </div>
      </div>

      {/* Text reveal — normal flow directly below the sticky block */}
      <GutterContainer>
        <EtherealTextReveal
          text={revealText}
          className="py-10 text-xl font-light leading-relaxed md:py-16 md:text-4xl"
        />
      </GutterContainer>
    </div>
  )
}
