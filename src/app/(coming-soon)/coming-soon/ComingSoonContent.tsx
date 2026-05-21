'use client'

import { useState } from 'react'
import Image from 'next/image'
import logo from '@/assets/framehouse_logo_expanded_color.svg'
import tempAsset from '@/assets/hub/temp_asset.png'
import { cn } from '@/utilities/cn'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export function ComingSoonContent() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/coming-soon/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to subscribe')
      }

      setState('success')
      setEmail('')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <header className="flex-none flex items-center px-8 md:px-12 lg:px-16 py-6">
        <Image src={logo} alt="Framehouse Hub" height={28} priority unoptimized />
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-6 md:px-12 lg:px-16 py-4 overflow-hidden">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Copy + CTA */}
          <div className="flex flex-col gap-6 order-2 lg:order-1">
            <p className="font-rubik text-[10px] tracking-[0.5em] uppercase text-[#7f5700]">
              Coming Soon
            </p>

            <h1
              className="font-sans text-4xl md:text-5xl lg:text-[3.25rem] text-[#1a1c1c] leading-[1.08] font-bold"
              style={{ letterSpacing: '-0.02em' }}
            >
              The Stage for Your Creative Work.
            </h1>

            <p className="font-sans text-base md:text-[17px] text-[#1a1c1c]/65 leading-relaxed max-w-md">
              A premium digital asset management platform built for independent creatives. Curate,
              organise, and share your work from a single, beautiful source of truth.
            </p>

            <form onSubmit={handleSubmit} className="mt-2">
              {state === 'success' ? (
                <div className="flex items-center gap-3 py-4">
                  <span className="w-6 h-6 rounded-full bg-[#d79922]/20 flex items-center justify-center text-[#7f5700] text-sm">
                    ✓
                  </span>
                  <span className="font-sans text-sm text-[#1a1c1c]/70">
                    You&apos;re on the list. We&apos;ll be in touch.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label htmlFor="email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={state === 'loading'}
                      className="w-full px-5 py-3.5 bg-[#f3f3f4] rounded-[16px] text-[#1a1c1c] placeholder:text-[#1a1c1c]/40 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#d79922]/40 transition-all duration-200 disabled:opacity-60"
                      aria-describedby={state === 'error' ? 'form-error' : undefined}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={state === 'loading'}
                    className={cn(
                      'px-7 py-3.5 rounded-[24px] font-rubik text-[10px] tracking-[0.2em] uppercase transition-all duration-300 whitespace-nowrap',
                      'bg-[#d79922] text-white shadow-[0_15px_30px_rgba(127,87,0,0.2)]',
                      'hover:shadow-[0_20px_40px_rgba(127,87,0,0.3)] hover:-translate-y-px hover:outline hover:outline-2 hover:outline-offset-2 hover:outline-[#d79922]/40',
                      'disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none',
                    )}
                  >
                    {state === 'loading' ? 'Sending…' : 'Notify Me'}
                  </button>
                </div>
              )}

              {state === 'error' && (
                <p id="form-error" className="mt-2 text-xs text-red-600 font-sans">
                  {errorMessage}
                </p>
              )}
            </form>
          </div>

          {/* Right: Asset Card */}
          <div className="flex items-center justify-center order-1 lg:order-2">
            <div
              className="relative w-[280px] h-[320px] md:w-[320px] md:h-[360px] lg:w-[360px] lg:h-[400px] rounded-[24px] overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow:
                  '0px 20px 40px rgba(26, 28, 28, 0.06), 0px 4px 12px rgba(26, 28, 28, 0.04)',
              }}
            >
              <div className="absolute inset-0 bg-[#f9f9f9]" />

              <div className="absolute top-0 right-0 w-48 h-48 bg-[#d79922]/8 rounded-full blur-[60px] -translate-y-1/4 translate-x-1/4 pointer-events-none" />

              <Image
                src={tempAsset}
                alt="Creative asset preview"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 280px, (max-width: 1024px) 320px, 360px"
              />

              <div className="absolute bottom-0 left-0 right-0 px-5 py-4 bg-white/80 backdrop-blur-sm">
                <p className="font-rubik text-[9px] tracking-[0.3em] uppercase text-[#7f5700]">
                  Asset Preview
                </p>
                <p className="font-sans text-xs text-[#1a1c1c]/60 mt-0.5">Untitled — Draft</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="flex-none flex items-center px-8 md:px-12 lg:px-16 py-5">
        <p className="font-sans text-[11px] text-[#1a1c1c]/40">
          © {new Date().getFullYear()} Framehouse Hub
        </p>
      </footer>
    </div>
  )
}
