import type { CollectionConfig } from 'payload'

export const portfolioEndpoints: CollectionConfig['endpoints'] = [
    {
        path: '/:id',
        method: 'patch',
        handler: async (req) => {
            const { id } = req.routeParams
            const { payload } = req

            // Remove the id field from the request body to prevent validation errors
            const requestData = req.data as Record<string, any> | undefined
            const { id: _removedId, ...updateData } = requestData || {}

            try {
                const updatedPortfolio = await payload.update({
                    collection: 'portfolios',
                    id,
                    data: updateData,
                    depth: req.query.depth ? Number(req.query.depth) : undefined,
                })

                return Response.json(updatedPortfolio)
            } catch (error: any) {
                return Response.json(
                    { errors: [{ message: error.message }] },
                    { status: error.status || 500 }
                )
            }
        },
    },
]
