import type { CollectionConfig } from 'payload'

export const portfolioEndpoints: CollectionConfig['endpoints'] = [
    {
        path: '/:id',
        method: 'patch',
        handler: async (req) => {
            const { id } = req.routeParams as { id: string }
            const { payload } = req

            // Remove the id field from the request body to prevent validation errors
            const requestData = req.data as Record<string, unknown> | undefined
            const { id: _removedId, ...updateData } = requestData || {}

            try {
                const updatedPortfolio = await payload.update({
                    collection: 'portfolios',
                    id,
                    data: updateData,
                    depth: req.query.depth ? Number(req.query.depth) : undefined,
                })

                return Response.json(updatedPortfolio)
            } catch (error: unknown) {
                const err = error as Error & { status?: number }
                return Response.json(
                    { errors: [{ message: err.message }] },
                    { status: err.status || 500 }
                )
            }
        },
    },
]
