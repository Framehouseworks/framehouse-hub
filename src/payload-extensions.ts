import type { Config } from 'payload'

export const onInitExtension: Config['onInit'] = async (payload) => {
    // Log to confirm this runs
    console.log('[Payload] Custom onInit hook registered')

    // Patch the update operation to strip ID from incoming data
    const originalUpdate = payload.update.bind(payload)

    // @ts-expect-error - Complex overload mismatch in monkeypatch
    payload.update = async (args: unknown) => {
        const updateArgs = args as Record<string, unknown>
        if (updateArgs.collection === 'portfolios' && updateArgs.data) {
            const data = updateArgs.data as Record<string, unknown>
            const id = data.id as string | undefined
            console.log('[Payload] Stripped ID from portfolios update:', id)
            const { id: _id, ...cleanData } = data
            updateArgs.data = cleanData
        }
        return originalUpdate(args as Parameters<typeof payload.update>[0])
    }
}
