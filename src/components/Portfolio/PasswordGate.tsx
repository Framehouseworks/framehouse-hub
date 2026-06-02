'use client'

import { cn } from '@/utilities/cn'
import type { ThemeConfig } from '@/components/Portfolio/PortfolioThemeProvider'
import { Eye, EyeOff, Lock } from 'lucide-react'
import React, { useState } from 'react'

interface Props {
  slug: string
  onUnlock: (password: string) => Promise<boolean>
  /** Portfolio name shown above the unlock form (requires theme to be set) */
  portfolioName?: string
  /** Creator theme — applies themed bg/text/accent before authentication */
  theme?: ThemeConfig
}

export function PasswordGate({ slug, onUnlock, portfolioName, theme }: Props) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!password.trim()) return
    setLoading(true)
    setError(false)
    const ok = await onUnlock(password)
    setLoading(false)
    if (!ok) {
      setError(true)
      setPassword('')
    }
  }

  const bg = theme?.backgroundColor ?? '#0a0a0a'
  const text = theme?.textColor ?? '#ffffff'
  const accent = theme?.accentColor ?? '#ffffff'
  const hasTheme = !!theme

  return (
    <div
      role="main"
      aria-label="Portfolio access"
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={hasTheme ? { backgroundColor: bg, color: text } : { backgroundColor: '#0a0a0a', color: '#ffffff' }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
        {/* Lock icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${accent}18` }}
        >
          <Lock size={22} style={{ color: `${accent}60` }} />
        </div>

        {/* Identity */}
        <div className="space-y-2">
          {portfolioName && (
            <h1
              className="text-2xl md:text-3xl tracking-tight leading-tight"
              style={{ color: text, fontWeight: 600 }}
            >
              {portfolioName}
            </h1>
          )}
          <p
            className={cn('text-sm', portfolioName ? 'mt-3' : 'text-xl font-semibold')}
            style={{ color: portfolioName ? `${text}60` : text }}
          >
            {portfolioName ? 'This gallery is protected.' : 'Portfolio protected'}
          </p>
          <p className="text-sm" style={{ color: `${text}40` }}>
            Enter the access password to continue.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Portfolio access password"
              className="w-full rounded-2xl px-4 py-3.5 pr-11 text-sm focus:outline-none"
              style={{
                backgroundColor: `${text}08`,
                border: `1px solid ${error ? '#ef4444' : `${text}14`}`,
                color: text,
              }}
              autoFocus
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: `${text}30` }}
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 text-left" role="alert" aria-live="polite">
              Incorrect password. Please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none"
            style={{
              background: hasTheme
                ? `linear-gradient(135deg, ${accent}CC, ${accent})`
                : '#ffffff',
              color: hasTheme ? bg : '#0a0a0a',
            }}
          >
            {loading ? 'Checking…' : 'Unlock Gallery'}
          </button>
        </form>

        {/* Attribution */}
        <p
          className="text-[10px] uppercase tracking-[0.4em]"
          style={{ color: `${text}20` }}
        >
          Framehouse Hub — {slug}
        </p>
      </div>
    </div>
  )
}
