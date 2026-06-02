'use client'

import React, { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utilities/cn'

interface Props {
  slug: string
  onUnlock: (password: string) => Promise<boolean>
}

export function PasswordGate({ slug, onUnlock }: Props) {
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

  return (
    <div role="main" aria-label="Portfolio access" className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
          <Lock size={24} className="text-white/40" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-white">Portfolio protected</h1>
          <p className="text-sm text-white/40">Enter the access password to view this gallery.</p>
        </div>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              aria-label="Portfolio access password"
              className={cn(
                'w-full bg-white/5 border rounded-2xl px-4 py-3.5 pr-10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/30',
                error ? 'border-red-500/60' : 'border-white/10',
              )}
              autoFocus
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-400" role="alert">
              Incorrect password. Please try again.
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3.5 rounded-2xl bg-white text-zinc-900 text-sm font-medium transition-all hover:bg-white/90 disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? 'Checking…' : 'Access Gallery'}
          </button>
        </form>
        <p className="text-[10px] text-white/20 uppercase tracking-widest">
          Framehouse Hub — {slug}
        </p>
      </div>
    </div>
  )
}
