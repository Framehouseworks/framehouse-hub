'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
  Archive,
  BookImage,
  Camera,
  Clock,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Eye,
} from 'lucide-react'

// Minimal inline types — not importing from payload-types to avoid admin bundle issues
interface CreativeMetrics {
  mediaCount: number
  portfolioCount: number
  sessionCount: number
  totalBytes: number
  recentActivity: ActivityEntry[]
}

interface ActivityEntry {
  id: string | number
  actionType: string
  actionDescription: string
  createdAt: string
  adminUser?: { name?: string | null; email: string } | string | number | null
}

interface PortfolioEntry {
  id: string | number
  name: string
  slug?: string | null
  visibility?: string | null
  _status?: string | null
  clientReviewSettings?: {
    allowDownload?: boolean | null
    allowSelection?: boolean | null
  } | null
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`
}

function VisibilityBadge({ visibility }: { visibility: string | null | undefined }) {
  const map: Record<string, { label: string; style: React.CSSProperties }> = {
    private: { label: 'Private', style: { background: 'rgba(26,28,28,0.08)', color: '#1a1c1c99' } },
    public: { label: 'Public', style: { background: '#dcfce7', color: '#166534' } },
    shared: { label: 'Password', style: { background: '#fef9c3', color: '#854d0e' } },
  }
  const { label, style } = map[visibility ?? 'private'] ?? map.private
  return (
    <span style={style} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold">
      {label}
    </span>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: React.ElementType
}) {
  return (
    <div style={{ background: '#f9f9f9', borderRadius: 16, padding: '16px', boxShadow: '0px 20px 40px rgba(26,28,28,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} style={{ color: '#7f5700' }} />
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1c1c', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.2em', color: '#1a1c1c66', textTransform: 'uppercase', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  inspect_account: 'Inspected account',
  launch_diagnostic: 'Launched diagnostic',
  terminate_diagnostic: 'Terminated diagnostic',
  diagnostic_expired: 'Diagnostic expired',
  portfolio_password_reset: 'Password reset',
  portfolio_visibility_change: 'Visibility changed',
  field_override: 'Field override',
  account_role_change: 'Role changed',
}

export function CreativeOversightView() {
  const pathname = usePathname()

  // Extract user ID from URL: /admin/collections/users/[id]/oversight
  const userId = pathname?.split('/').at(-2) ?? null

  const [metrics, setMetrics] = useState<CreativeMetrics | null>(null)
  const [portfolios, setPortfolios] = useState<PortfolioEntry[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [loadingPortfolios, setLoadingPortfolios] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreative, setIsCreative] = useState<boolean | null>(null)

  useEffect(() => {
    if (!userId) return

    // Check if user is creative and fetch metrics
    setLoadingMetrics(true)
    Promise.all([
      fetch(`/api/admin/creative-metrics/${userId}`).then((r) => r.json()),
      fetch(`/api/users/${userId}`).then((r) => r.json()),
    ])
      .then(([metricsData, userData]) => {
        if (metricsData.error) {
          setError(metricsData.error)
        } else {
          setMetrics(metricsData)
        }
        const roles: string[] = userData?.roles ?? userData?.doc?.roles ?? []
        setIsCreative(roles.includes('creative'))
      })
      .catch(() => setError('Failed to load account metrics'))
      .finally(() => setLoadingMetrics(false))

    // Fetch portfolios
    setLoadingPortfolios(true)
    fetch(`/api/portfolios?where[owner][equals]=${userId}&limit=50&sort=-updatedAt&depth=0`)
      .then((r) => r.json())
      .then((data) => {
        setPortfolios(data.docs ?? [])
      })
      .catch(() => {
        // Non-fatal — portfolio list is best-effort
      })
      .finally(() => setLoadingPortfolios(false))
  }, [userId])

  const handleLaunchDiagnostic = useCallback(async () => {
    if (!userId || launching) return
    setLaunching(true)
    try {
      const res = await fetch('/api/admin/diagnostic-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(`Failed to create diagnostic session: ${data.error ?? 'Unknown error'}`)
        return
      }
      const { token } = await res.json()
      window.open(`/dashboard/diagnostic/${token}`, '_blank', 'noopener,noreferrer')
    } catch {
      alert('Failed to create diagnostic session. Please try again.')
    } finally {
      setLaunching(false)
    }
  }, [userId, launching])

  if (!userId) {
    return (
      <div style={{ padding: 32, color: '#1a1c1c99', textAlign: 'center' }}>
        Unable to resolve user ID from URL.
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1c1c', marginBottom: 8 }}>
          Creative Oversight
        </h2>
        <p style={{ fontSize: 13, color: '#1a1c1c66' }}>
          Inspect this account, view their portfolios, and launch a read-only diagnostic session.
        </p>
      </div>

      {/* Non-creative notice */}
      {isCreative === false && (
        <div
          style={{
            background: '#fef9c3',
            borderRadius: 16,
            padding: '12px 16px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: '#854d0e',
          }}
          role="alert"
        >
          <AlertTriangle size={16} />
          This user does not have the Creative role. Some oversight features may be limited.
          Diagnostic Mirror is only available for Creative accounts.
        </div>
      )}

      {/* Metrics */}
      {loadingMetrics ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
          <Loader2 size={24} style={{ color: '#7f5700', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : error ? (
        <div
          style={{
            background: '#fee2e2',
            borderRadius: 16,
            padding: '12px 16px',
            color: '#991b1b',
            marginBottom: 24,
            fontSize: 13,
          }}
          role="alert"
        >
          {error}
        </div>
      ) : metrics && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <MetricCard label="Media Items" value={metrics.mediaCount} icon={Archive} />
          <MetricCard label="Portfolios" value={metrics.portfolioCount} icon={BookImage} />
          <MetricCard label="Sessions" value={metrics.sessionCount} icon={Camera} />
          <MetricCard label="Storage Used" value={formatBytes(metrics.totalBytes)} icon={Archive} />
        </div>
      )}

      {/* Two-column layout: portfolios + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Portfolios */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1c1c', marginBottom: 12 }}>
            Portfolios
          </h3>
          {loadingPortfolios ? (
            <div style={{ color: '#1a1c1c66', fontSize: 13 }}>Loading…</div>
          ) : portfolios.length === 0 ? (
            <div
              style={{
                background: '#f9f9f9',
                borderRadius: 16,
                padding: 24,
                textAlign: 'center',
                color: '#1a1c1c66',
                fontSize: 13,
              }}
            >
              No portfolios yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {portfolios.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: '#f9f9f9',
                    borderRadius: 16,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1c1c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      <VisibilityBadge visibility={p.visibility} />
                      {p._status === 'draft' && (
                        <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#1a1c1c66', background: '#1a1c1c12', padding: '2px 6px', borderRadius: 8 }}>
                          DRAFT
                        </span>
                      )}
                    </div>
                    {p.slug && (
                      <div style={{ fontSize: 11, color: '#1a1c1c55', fontFamily: 'monospace' }}>
                        /{p.slug}
                      </div>
                    )}
                  </div>
                  <a
                    href={`/admin/collections/portfolios/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 12px',
                      background: '#d79922',
                      color: '#1a1c1c',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Edit
                    <ExternalLink size={10} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1c1c', marginBottom: 12 }}>
            Recent Admin Activity
          </h3>
          {!metrics || metrics.recentActivity.length === 0 ? (
            <div
              style={{
                background: '#f9f9f9',
                borderRadius: 16,
                padding: 24,
                textAlign: 'center',
                color: '#1a1c1c66',
                fontSize: 13,
              }}
            >
              No admin actions recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {metrics.recentActivity.map((entry) => {
                const adminName =
                  typeof entry.adminUser === 'object' && entry.adminUser
                    ? entry.adminUser.name ?? entry.adminUser.email
                    : 'Admin'
                const date = new Date(entry.createdAt).toLocaleString()
                return (
                  <div
                    key={entry.id}
                    style={{
                      background: '#f9f9f9',
                      borderRadius: 16,
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Clock size={12} style={{ color: '#1a1c1c55', marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, color: '#1a1c1c', fontWeight: 500 }}>
                          {ACTION_TYPE_LABELS[entry.actionType] ?? entry.actionType}
                        </div>
                        <div style={{ fontSize: 11, color: '#1a1c1c66', marginTop: 2 }}>
                          by {adminName} · {date}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Launch Diagnostic */}
      <div
        style={{
          background: '#f9f9f9',
          borderRadius: 16,
          padding: 24,
          boxShadow: '0px 20px 40px rgba(26,28,28,0.06)',
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1c1c', marginBottom: 8 }}>
          Read-Only Diagnostic Mirror
        </h3>
        <p style={{ fontSize: 13, color: '#1a1c1c66', marginBottom: 16, lineHeight: 1.6 }}>
          Opens a secure, read-only view of this creative&apos;s workspace in a new browser tab.
          Session expires in 15 minutes. All actions are logged.
        </p>
        <button
          onClick={handleLaunchDiagnostic}
          disabled={launching || isCreative === false}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: isCreative === false ? '#1a1c1c22' : 'linear-gradient(135deg, #7f5700 0%, #d79922 100%)',
            color: isCreative === false ? '#1a1c1c66' : '#ffffff',
            borderRadius: 24,
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            cursor: launching || isCreative === false ? 'not-allowed' : 'pointer',
            transition: 'opacity 0.2s',
            opacity: launching ? 0.7 : 1,
          }}
          title={isCreative === false ? 'Only available for Creative accounts' : undefined}
          aria-busy={launching}
        >
          {launching ? (
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />
          ) : (
            <Eye size={16} aria-hidden />
          )}
          {launching ? 'Opening session…' : 'Launch Read-Only Diagnostic Mirror →'}
        </button>
      </div>
    </div>
  )
}
