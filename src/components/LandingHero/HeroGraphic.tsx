'use client'
import React from 'react'

// Replicates the actual MediaCard design:
//   rounded-[24px], full-bleed image gradient fill, bottom identity bar with
//   gradient scrim, title + type label rows, top-left badges, camera icon badge.
// All geometry matches the real card proportions at reduced scale.
export const HeroGraphic: React.FC = () => {
  return (
    <div className="relative w-full h-full flex items-center justify-center" aria-hidden="true">
      <style>{`
        @keyframes cardFloatA {
          0%,100% { transform: translateY(0px) rotate(-1deg); }
          50%      { transform: translateY(-14px) rotate(-1deg); }
        }
        @keyframes cardFloatB {
          0%,100% { transform: translateY(-8px) rotate(1.5deg); }
          50%      { transform: translateY(8px) rotate(1.5deg); }
        }
        @keyframes cardFloatC {
          0%,100% { transform: translateY(4px) rotate(-0.5deg); }
          50%      { transform: translateY(-16px) rotate(-0.5deg); }
        }
        @keyframes cardFloatD {
          0%,100% { transform: translateY(0px) rotate(2deg); }
          50%      { transform: translateY(-10px) rotate(2deg); }
        }
        .hg-card-a { animation: cardFloatA 8s ease-in-out infinite; transform-origin: center; }
        .hg-card-b { animation: cardFloatB 10s ease-in-out infinite; animation-delay: -3s; transform-origin: center; }
        .hg-card-c { animation: cardFloatC 9s ease-in-out infinite; animation-delay: -6s; transform-origin: center; }
        .hg-card-d { animation: cardFloatD 11s ease-in-out infinite; animation-delay: -1.5s; transform-origin: center; }
      `}</style>

      <svg
        viewBox="0 0 560 640"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-w-[560px] max-h-[640px]"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* ── Image fill gradients — simulate photo thumbnail tones ── */}
          <linearGradient id="fillA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#1a1f2e" />
            <stop offset="55%"  stopColor="#2d3a52" />
            <stop offset="100%" stopColor="#8b6520" />
          </linearGradient>
          <linearGradient id="fillB" x1="0%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%"   stopColor="#1e2a1e" />
            <stop offset="60%"  stopColor="#2a3d2a" />
            <stop offset="100%" stopColor="#4a6040" />
          </linearGradient>
          <linearGradient id="fillC" x1="20%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#2a1a14" />
            <stop offset="50%"  stopColor="#3d2518" />
            <stop offset="100%" stopColor="#7a4020" />
          </linearGradient>
          <linearGradient id="fillD" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#141a2a" />
            <stop offset="100%" stopColor="#1e2d44" />
          </linearGradient>

          {/* ── Identity bar gradient scrims (bottom-up, matches card CSS) ── */}
          <linearGradient id="scrimA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.72" />
          </linearGradient>
          <linearGradient id="scrimB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.72" />
          </linearGradient>
          <linearGradient id="scrimC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.72" />
          </linearGradient>
          <linearGradient id="scrimD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.72" />
          </linearGradient>

          {/* Ambient shadow filter */}
          <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000" floodOpacity="0.22" />
          </filter>
          <filter id="cardShadowFg" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="20" stdDeviation="24" floodColor="#000" floodOpacity="0.32" />
          </filter>

          {/* Clip paths for rounded-[24px] cards */}
          <clipPath id="clipA"><rect x="150" y="152" width="218" height="292" rx="24" /></clipPath>
          <clipPath id="clipB"><rect x="16"  y="88"  width="258" height="180" rx="24" /></clipPath>
          <clipPath id="clipC"><rect x="350" y="200" width="178" height="248" rx="24" /></clipPath>
          <clipPath id="clipD"><rect x="58"  y="452" width="228" height="156" rx="24" /></clipPath>
        </defs>

        {/* ═══════════════════════════════════════════════════════
            CARD B — landscape, top-left, behind main card
            Simulates: forest/green-toned shoot, RAW badge
        ═══════════════════════════════════════════════════════ */}
        <g className="hg-card-b" filter="url(#cardShadow)">
          {/* Card body */}
          <rect x="16" y="88" width="258" height="180" rx="24" fill="url(#fillB)" />
          {/* Subtle texture grain lines */}
          <g clipPath="url(#clipB)" opacity="0.06">
            <line x1="16" y1="160" x2="274" y2="160" stroke="white" strokeWidth="0.5" />
            <line x1="16" y1="200" x2="274" y2="200" stroke="white" strokeWidth="0.5" />
          </g>
          {/* Identity scrim */}
          <rect x="16" y="194" width="258" height="74" fill="url(#scrimB)" clipPath="url(#clipB)" />
          {/* Title bar */}
          <rect x="28" y="225" width="140" height="7" rx="3.5" fill="white" fillOpacity="0.85" />
          {/* Type label row */}
          <rect x="28" y="238" width="56" height="5" rx="2.5" fill="#d79922" fillOpacity="0.7" />
          <rect x="90" y="239" width="2" height="3" rx="1" fill="white" fillOpacity="0.2" />
          <rect x="96" y="238" width="40" height="5" rx="2.5" fill="white" fillOpacity="0.25" />
          {/* RAW badge — top-left, matches CardTopBadges */}
          <rect x="28" y="100" width="34" height="16" rx="8" fill="#d79922" fillOpacity="0.22" />
          <rect x="28" y="100" width="34" height="16" rx="8" stroke="#d79922" strokeWidth="0.8" strokeOpacity="0.45" />
          <text x="45" y="112" textAnchor="middle" fill="#d79922" fontSize="6.5"
            letterSpacing="0.8" style={{ fontFamily: 'var(--font-rubik), monospace' }}>RAW</text>
        </g>

        {/* ═══════════════════════════════════════════════════════
            CARD D — small landscape, bottom, behind main card
            Simulates: moody blue shoot, camera metadata badge
        ═══════════════════════════════════════════════════════ */}
        <g className="hg-card-d" filter="url(#cardShadow)">
          <rect x="58" y="452" width="228" height="156" rx="24" fill="url(#fillD)" />
          {/* Identity scrim */}
          <rect x="58" y="554" width="228" height="54" fill="url(#scrimD)" clipPath="url(#clipD)" />
          {/* Title bar */}
          <rect x="70" y="576" width="120" height="7" rx="3.5" fill="white" fillOpacity="0.82" />
          {/* Type row */}
          <rect x="70" y="589" width="48" height="5" rx="2.5" fill="#d79922" fillOpacity="0.65" />
          <rect x="124" y="590" width="2" height="3" rx="1" fill="white" fillOpacity="0.2" />
          <rect x="130" y="589" width="36" height="5" rx="2.5" fill="white" fillOpacity="0.22" />
          {/* Camera icon badge — top-right (matches pedigree icon in CardTopBadges) */}
          <rect x="258" y="464" width="18" height="18" rx="9" fill="black" fillOpacity="0.62" />
          {/* Camera icon simplified */}
          <rect x="262.5" y="469" width="9" height="7" rx="1.5" fill="none" stroke="#d79922" strokeWidth="0.9" strokeOpacity="0.8" />
          <circle cx="267" cy="472.5" r="1.8" fill="none" stroke="#d79922" strokeWidth="0.8" strokeOpacity="0.8" />
          <rect x="266" y="467.5" width="3.5" height="1.8" rx="0.9" fill="#d79922" fillOpacity="0.7" />
        </g>

        {/* ═══════════════════════════════════════════════════════
            CARD C — portrait, right side, mid-layer
            Simulates: warm amber shoot
        ═══════════════════════════════════════════════════════ */}
        <g className="hg-card-c" filter="url(#cardShadow)">
          <rect x="350" y="200" width="178" height="248" rx="24" fill="url(#fillC)" />
          {/* Subtle highlight */}
          <rect x="350" y="200" width="178" height="80" rx="24" fill="white" fillOpacity="0.03" clipPath="url(#clipC)" />
          {/* Identity scrim */}
          <rect x="350" y="362" width="178" height="86" fill="url(#scrimC)" clipPath="url(#clipC)" />
          {/* Title bar */}
          <rect x="362" y="396" width="110" height="7" rx="3.5" fill="white" fillOpacity="0.88" />
          {/* Type row */}
          <rect x="362" y="409" width="44" height="5" rx="2.5" fill="#d79922" fillOpacity="0.68" />
          <rect x="412" y="410" width="2" height="3" rx="1" fill="white" fillOpacity="0.2" />
          <rect x="418" y="409" width="36" height="5" rx="2.5" fill="white" fillOpacity="0.25" />
          {/* Processing badge — animated border */}
          <rect x="362" y="212" width="56" height="16" rx="8"
            fill="black" fillOpacity="0.7" stroke="#fbbf24" strokeWidth="0.8" strokeOpacity="0.5" />
          <circle cx="374" cy="220" r="3" fill="#fbbf24" fillOpacity="0.85" />
          <text x="395" y="224" textAnchor="middle" fill="#fbbf24" fontSize="6"
            letterSpacing="0.6" style={{ fontFamily: 'var(--font-rubik), monospace' }}>IMAGE</text>
        </g>

        {/* ═══════════════════════════════════════════════════════
            CARD A — main portrait card, foreground, centre
            Simulates: blue-hour / golden-hour shoot, selected state
        ═══════════════════════════════════════════════════════ */}
        <g className="hg-card-a" filter="url(#cardShadowFg)">
          {/* Selection ring (ring-2 ring-gallery-gold/60) */}
          <rect x="146" y="148" width="226" height="300" rx="26"
            fill="none" stroke="#d79922" strokeWidth="2.5" strokeOpacity="0.55" />
          {/* Card body */}
          <rect x="150" y="152" width="218" height="292" rx="24" fill="url(#fillA)" />
          {/* Horizon highlight — subtle top gradient */}
          <rect x="150" y="152" width="218" height="90" rx="24" fill="white" fillOpacity="0.04" clipPath="url(#clipA)" />
          {/* Faint horizon line across image */}
          <line x1="150" y1="260" x2="368" y2="260" stroke="white" strokeWidth="0.4" strokeOpacity="0.08" />
          {/* Identity scrim — 90px from bottom */}
          <rect x="150" y="354" width="218" height="90" fill="url(#scrimA)" clipPath="url(#clipA)" />
          {/* Title bar */}
          <rect x="164" y="394" width="148" height="8" rx="4" fill="white" fillOpacity="0.9" />
          {/* Accession ID row */}
          <rect x="164" y="409" width="64" height="5.5" rx="2.5" fill="#d79922" fillOpacity="0.72" />
          <rect x="234" y="410.5" width="2" height="3" rx="1" fill="white" fillOpacity="0.22" />
          <rect x="240" y="409" width="48" height="5.5" rx="2.5" fill="white" fillOpacity="0.28" />
          {/* Camera badge — top right */}
          <rect x="340" y="164" width="18" height="18" rx="9" fill="black" fillOpacity="0.62" />
          <rect x="344.5" y="169" width="9" height="7" rx="1.5" fill="none" stroke="#d79922" strokeWidth="0.9" strokeOpacity="0.82" />
          <circle cx="349" cy="172.5" r="1.8" fill="none" stroke="#d79922" strokeWidth="0.8" strokeOpacity="0.82" />
          <rect x="348" y="167.5" width="3.5" height="1.8" rx="0.9" fill="#d79922" fillOpacity="0.72" />
          {/* Checked checkbox — top left (selected state) */}
          <rect x="164" y="164" width="16" height="16" rx="4"
            fill="#d79922" />
          {/* Checkmark */}
          <polyline points="168,172 171,175 176,169" fill="none"
            stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  )
}
