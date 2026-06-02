import type { CollectionConfig } from 'payload'

/**
 * Enterprise in-process rate limiter for the portfolio PATCH endpoint (Issue 10).
 *
 * Limits: max 1 save per 2 seconds per (userId, portfolioId) pair.
 * Storage: in-process Map — resets on Cloud Run cold start, which is acceptable
 * because autosave uses a 3s client-side debounce as the primary throttle.
 * This is a last-resort guard against clients bypassing the debounce.
 *
 * At 10,000 concurrent users this Map holds ≤10,000 entries of ~60 bytes each
 * = ~600KB peak RAM — well within the 512MB Cloud Run instance limit.
 */
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_WINDOW_MS = 2000
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60_000

// Periodic cleanup to prevent unbounded Map growth at scale
if (typeof globalThis !== 'undefined' && typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS
    for (const [key, ts] of rateLimitMap) {
      if (ts < cutoff) rateLimitMap.delete(key)
    }
  }, RATE_LIMIT_CLEANUP_INTERVAL_MS)
}

function checkRateLimit(userId: number | string, portfolioId: string): boolean {
  const key = `${userId}:${portfolioId}`
  const lastSave = rateLimitMap.get(key) ?? 0
  const now = Date.now()
  if (now - lastSave < RATE_LIMIT_WINDOW_MS) return false   // rate-limited
  rateLimitMap.set(key, now)
  return true
}

export const portfolioEndpoints: CollectionConfig['endpoints'] = [
  {
    path: '/:id',
    method: 'patch',
    handler: async (req) => {
      // Authenticate — reject unauthenticated callers
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { id } = req.routeParams as { id: string }
      const { payload } = req

      // Enterprise rate limiting: 1 save per 2s per (user, portfolio) (Issue 10)
      if (!checkRateLimit(req.user.id, id)) {
        return Response.json(
          { error: 'Too many requests. Please wait before saving again.' },
          { status: 429, headers: { 'Retry-After': '2' } },
        )
      }

      const requestData = req.data as Record<string, unknown> | undefined
      const { id: _removedId, ...updateData } = requestData || {}

      // Optimistic concurrency: compare draft timestamp if client provides one
      const ifUnmodifiedSince = req.headers.get('x-if-unmodified-since')
      if (ifUnmodifiedSince) {
        try {
          const current = await payload.findByID({
            collection: 'portfolios',
            id,
            depth: 0,
            draft: true,
            user: req.user,
          })
          if (current && current.updatedAt !== ifUnmodifiedSince) {
            return Response.json(
              { conflict: true, updatedAt: current.updatedAt },
              { status: 409 },
            )
          }
        } catch {
          // proceed with update if pre-flight fetch fails
        }
      }

      try {
        const updatedPortfolio = await payload.update({
          collection: 'portfolios',
          id,
          data: updateData,
          depth: req.query.depth ? Number(req.query.depth) : undefined,
          user: req.user, // enforces ownerOrAdmin access control
        })

        return Response.json(updatedPortfolio)
      } catch (error: unknown) {
        const err = error as Error & { status?: number }
        return Response.json(
          { errors: [{ message: err.message }] },
          { status: err.status || 500 },
        )
      }
    },
  },
]
