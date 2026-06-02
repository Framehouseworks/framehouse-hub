import type { CollectionConfig } from 'payload'

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
