'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Lock, Laptop, RefreshCw } from 'lucide-react'
import { cn } from '@/utilities/cn'
import { toast } from 'sonner'
import { ReauthModal } from '@/components/account/ReauthModal'
import { useAuth } from '@/providers/Auth'
import { formatDistanceToNow } from 'date-fns'
import type { User } from '@/payload-types'
import type { SessionsResponse } from '@/types/sessions'

// ─── Password strength indicator ──────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const hasMin = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const score = [hasMin, hasUpper, hasNumber].filter(Boolean).length

  if (!password) return null

  const segments = [
    score >= 1 ? (score === 1 ? 'bg-gallery-red' : score === 2 ? 'bg-amber-500' : 'bg-gallery-gold') : 'bg-on-surface/10',
    score >= 2 ? (score === 2 ? 'bg-amber-500' : 'bg-gallery-gold') : 'bg-on-surface/10',
    score >= 3 ? 'bg-gallery-gold' : 'bg-on-surface/10',
  ]

  const label = score === 1 ? 'Weak' : score === 2 ? 'Medium' : 'Strong'
  const labelColor =
    score === 1 ? 'text-gallery-red' : score === 2 ? 'text-amber-500' : 'text-gallery-gold'

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1" role="meter" aria-label={`Password strength: ${label}`}>
        {segments.map((color, i) => (
          <div key={i} className={cn('flex-1 h-1 rounded-full transition-colors duration-300', color)} />
        ))}
      </div>
      <div className="flex items-center gap-4">
        <span className={cn('font-rubik text-[10px] font-semibold', labelColor)}>{label}</span>
        {[
          { ok: hasMin, label: '8+ chars' },
          { ok: hasUpper, label: 'Uppercase' },
          { ok: hasNumber, label: 'Number' },
        ].map(({ ok, label: l }) => (
          <span
            key={l}
            className={cn('text-[10px] transition-colors', ok ? 'text-gallery-gold' : 'text-on-surface/30')}
          >
            {ok ? '✓' : '○'} {l}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Session card ─────────────────────────────────────────────────────────────

type Session = NonNullable<User['sessions']>[number]

function SessionCard({
  session,
  isCurrent,
}: {
  session: Session
  isCurrent: boolean
}) {
  const createdAt = session.createdAt ? new Date(session.createdAt) : null
  const expiresAt = session.expiresAt ? new Date(session.expiresAt) : null

  const createdLabel =
    createdAt && !isNaN(createdAt.getTime())
      ? formatDistanceToNow(createdAt, { addSuffix: true })
      : null

  const expiresLabel =
    expiresAt && !isNaN(expiresAt.getTime())
      ? expiresAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : null

  return (
    <div
      className={cn(
        'flex items-start gap-3 py-3 px-4 rounded-2xl transition-colors',
        isCurrent
          ? 'bg-gallery-gold/5 ring-1 ring-gallery-gold/15'
          : 'bg-on-surface/[0.03] dark:bg-white/[0.03]',
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
          isCurrent ? 'bg-gallery-gold/10' : 'bg-on-surface/5',
        )}
      >
        <Laptop
          size={16}
          className={cn(isCurrent ? 'text-gallery-gold' : 'text-on-surface/40')}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-on-surface">
            {isCurrent ? 'This device' : 'Other session'}
          </span>
          {isCurrent && (
            <span className="font-rubik text-[9px] bg-gallery-gold/10 text-gallery-gold px-2 py-0.5 rounded-full tracking-wide uppercase shrink-0">
              Active
            </span>
          )}
        </div>

        <div className="space-y-0.5">
          {createdLabel && (
            <p className="text-xs text-on-surface/50">
              Signed in {createdLabel}
            </p>
          )}
          {expiresLabel && (
            <p className="text-xs text-on-surface/40">
              Session valid until {expiresLabel}
            </p>
          )}
          <p className="font-rubik text-[9px] text-on-surface/25 tracking-wide uppercase mt-1">
            ID {(session.id ?? '').slice(0, 8).toUpperCase() || '—'}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Security section ─────────────────────────────────────────────────────────

export const SecuritySection: React.FC = () => {
  const { user, setUser } = useAuth()

  // Password change state
  const [reauthOpen, setReauthOpen] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Sessions state — fetched from server (includes currentSessionId via _sid)
  const [sessionsData, setSessionsData] = useState<SessionsResponse | null>(null)
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [revokingOthers, setRevokingOthers] = useState(false)
  const [revokingAll, setRevokingAll] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me/sessions', { credentials: 'include' })
      if (res.ok) {
        const data: SessionsResponse = await res.json()
        setSessionsData(data)
      }
    } catch {
      // Non-fatal — leave previous data
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSessions()
  }, [fetchSessions])

  // ── Password save ────────────────────────────────────────────────────────────

  const handlePasswordSave = async () => {
    if (!user || !newPassword || newPassword !== confirmPassword) return
    setSaving(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/${user.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setUser(json.doc)
      setNewPassword('')
      setConfirmPassword('')
      setUnlocked(false)
      toast.success('Password updated successfully.')
    } catch {
      toast.error('Failed to update password.')
    } finally {
      setSaving(false)
    }
  }

  // ── Session revoke — keep current ────────────────────────────────────────────

  const handleRevokeOthers = async () => {
    setRevokingOthers(true)
    try {
      const res = await fetch('/api/users/me/sessions?keepCurrent=true', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      await fetchSessions()
      toast.success(
        json.revokedCount > 0
          ? `Signed out ${json.revokedCount} other device${json.revokedCount !== 1 ? 's' : ''}.`
          : 'No other sessions to revoke.',
      )
    } catch {
      toast.error('Failed to revoke sessions.')
    } finally {
      setRevokingOthers(false)
    }
  }

  // ── Session revoke — all ──────────────────────────────────────────────────────

  const handleRevokeAll = async () => {
    setRevokingAll(true)
    try {
      const res = await fetch('/api/users/me/sessions', {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error()
      await fetchSessions()
      toast.success('Signed out of all devices. Your current session remains active until you next refresh.')
    } catch {
      toast.error('Failed to sign out all devices.')
    } finally {
      setRevokingAll(false)
    }
  }

  const passwordValid =
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /\d/.test(newPassword) &&
    newPassword === confirmPassword

  const sessions = sessionsData?.sessions ?? []
  const currentSessionId = sessionsData?.currentSessionId ?? null
  const otherSessionCount = sessions.filter((s) => s.id !== currentSessionId).length

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <section id="security" className="space-y-6 scroll-mt-[148px] lg:scroll-mt-8">
      <div>
        <h2 className="text-lg font-semibold text-on-surface">Security</h2>
        <p className="mt-1 text-sm text-on-surface/50">
          Password management and active session control.
        </p>
      </div>

      {/* ── Password ─────────────────────────────────────────────────────────── */}
      <div className="bg-gallery-surface/60 rounded-2xl p-5 sm:p-6 space-y-5 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-on-surface/5 flex items-center justify-center shrink-0">
              <Lock size={16} className="text-on-surface/40" />
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">Password</p>
              <p className="text-xs text-on-surface/40">
                Secured with bcrypt hashing
              </p>
            </div>
          </div>
          {!unlocked && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs shrink-0"
              onClick={() => setReauthOpen(true)}
            >
              Change
            </Button>
          )}
        </div>

        {unlocked && (
          <div className="space-y-4 pt-1">
            {/* New password */}
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-medium">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-2xl pr-10"
                  placeholder="Minimum 8 characters"
                  autoFocus
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface/60"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength password={newPassword} />
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-2xl pr-10"
                  placeholder="Repeat new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface/30 hover:text-on-surface/60"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-gallery-red">Passwords do not match.</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-2xl flex-1 sm:flex-none"
                onClick={() => {
                  setUnlocked(false)
                  setNewPassword('')
                  setConfirmPassword('')
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!passwordValid || saving}
                onClick={handlePasswordSave}
                className="rounded-2xl flex-1 sm:flex-none bg-gradient-to-r from-[#7f5700] to-[#d79922] text-white hover:opacity-90"
              >
                {saving ? 'Saving…' : 'Update Password'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Active Sessions ───────────────────────────────────────────────────── */}
      <div className="bg-gallery-surface/60 rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0px_20px_40px_rgba(26,28,28,0.06)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-on-surface">Active Sessions</p>
            <p className="text-xs text-on-surface/40 mt-0.5">
              {sessionsLoading
                ? 'Loading…'
                : sessions.length === 0
                  ? 'No active sessions found'
                  : `${sessions.length} active session${sessions.length !== 1 ? 's' : ''} across your account`}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchSessions}
            aria-label="Refresh sessions"
            className="text-on-surface/30 hover:text-on-surface/60 transition-colors mt-0.5 shrink-0"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Session list */}
        {sessionsLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-[72px] rounded-2xl bg-on-surface/5" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-6 text-sm text-on-surface/40">
            No active sessions. Sign in to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isCurrent={session.id === currentSessionId}
              />
            ))}
          </div>
        )}

        {/* Action buttons */}
        {!sessionsLoading && sessions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            {otherSessionCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs flex-1 sm:flex-none"
                onClick={handleRevokeOthers}
                disabled={revokingOthers || revokingAll}
              >
                {revokingOthers
                  ? 'Signing out…'
                  : `Sign Out Other Devices (${otherSessionCount})`}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl text-xs text-gallery-red border-gallery-red/20 hover:bg-gallery-red/5 flex-1 sm:flex-none"
              onClick={handleRevokeAll}
              disabled={revokingOthers || revokingAll}
              title="Signs out all devices including this one. Your current page will still work until you refresh."
            >
              {revokingAll ? 'Signing out…' : 'Sign Out All Devices'}
            </Button>
          </div>
        )}

        {/* Explanatory micro-copy */}
        {!sessionsLoading && sessions.length > 0 && (
          <p className="text-[11px] text-on-surface/30 leading-relaxed">
            Each session represents an active login across a device or browser. Sessions expire
            automatically after inactivity. Signing out other devices will take effect on their
            next request.
          </p>
        )}
      </div>

      <ReauthModal
        open={reauthOpen}
        onSuccess={() => {
          setReauthOpen(false)
          setUnlocked(true)
        }}
        onClose={() => setReauthOpen(false)}
      />
    </section>
  )
}
