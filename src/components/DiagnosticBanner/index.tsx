'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, Eye } from 'lucide-react'
import { cn } from '@/utilities/cn'

interface DiagnosticBannerProps {
  targetCreativeName: string | null
  targetCreativeEmail: string
  expiresAt: string
  sessionToken: string
  /** Back-link shown after termination — defaults to /admin/collections/users */
  adminReturnUrl?: string
}

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, new Date(expiresAt).getTime() - Date.now()),
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const isExpired = remaining === 0
  const isUrgent = remaining < 120000 // under 2 min

  return { minutes, seconds, isExpired, isUrgent }
}

export function DiagnosticBanner({
  targetCreativeName,
  targetCreativeEmail,
  expiresAt,
  sessionToken,
  adminReturnUrl = '/admin/collections/users',
}: DiagnosticBannerProps) {
  const router = useRouter()
  const { minutes, seconds, isExpired, isUrgent } = useCountdown(expiresAt)
  const [terminating, setTerminating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Auto-navigate to expired page when TTL hits zero
  useEffect(() => {
    if (isExpired) {
      router.replace(`/dashboard/diagnostic/${sessionToken}/expired`)
    }
  }, [isExpired, sessionToken, router])

  const handleTerminate = useCallback(async () => {
    if (terminating) return
    setTerminating(true)
    try {
      await fetch(`/api/admin/diagnostic-sessions/${sessionToken}`, {
        method: 'DELETE',
      })
    } catch {
      // Best-effort — navigate regardless
    }
    router.push(adminReturnUrl)
  }, [terminating, sessionToken, adminReturnUrl, router])

  const displayName = targetCreativeName ?? targetCreativeEmail

  return (
    <>
      {/* Fixed diagnostic banner — always on top */}
      <div
        role="alert"
        aria-live="polite"
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 h-12"
        style={{ backgroundColor: '#ff7f67' }}
      >
        {/* Left: icon + label */}
        <div className="flex items-center gap-2 min-w-0">
          <Eye size={16} className="text-white shrink-0" aria-hidden />
          <span className="text-white font-semibold text-xs sm:text-sm truncate">
            <span className="hidden sm:inline">ADMIN VIEW ONLY — Inspecting: </span>
            <span className="sm:hidden">Admin View — </span>
            <span className="font-bold">{displayName}</span>
          </span>
        </div>

        {/* Center: countdown */}
        <div
          className={cn(
            'hidden sm:flex items-center gap-1.5 text-white text-xs font-mono',
            isUrgent && 'animate-pulse',
          )}
          aria-label={`Session expires in ${minutes} minutes ${seconds} seconds`}
        >
          <Clock size={13} aria-hidden />
          <span>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>

        {/* Right: terminate */}
        {showConfirm ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-white text-xs hidden sm:inline">Terminate session?</span>
            <button
              onClick={handleTerminate}
              disabled={terminating}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded-xl transition-colors disabled:opacity-50 font-semibold"
            >
              {terminating ? 'Ending…' : 'Yes, end'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Cancel termination"
            >
              <X size={14} className="text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded-xl transition-colors shrink-0 font-semibold"
            aria-label="Terminate diagnostic session"
          >
            <X size={13} aria-hidden />
            <span className="hidden sm:inline">Terminate Session</span>
            <span className="sm:hidden">End</span>
          </button>
        )}
      </div>

      {/* Spacer so page content doesn't hide behind the banner */}
      <div className="h-12 shrink-0" aria-hidden />
    </>
  )
}
