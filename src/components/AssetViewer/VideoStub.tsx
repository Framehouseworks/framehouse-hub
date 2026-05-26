'use client'

import React from 'react'

/** MVP stub — video playback is deferred to v1. Framework is in place. */
export const VideoStub: React.FC = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
    <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center">
      <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375z"
        />
      </svg>
    </div>
    <div className="text-center space-y-1">
      <p className="text-xs font-bold tracking-widest uppercase font-rubik text-white/40">
        Video Playback
      </p>
      <p className="text-[10px] text-white/20">Coming in v1</p>
    </div>
  </div>
)
