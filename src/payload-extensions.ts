import type { Config } from 'payload'

export const onInitExtension: Config['onInit'] = async (payload) => {
    // Log to confirm this runs
    console.log('[Payload] Custom onInit hook registered')

    // Patch the update operation to strip ID from incoming data
    const originalUpdate = payload.update.bind(payload)

    payload.update = async (args: any) => {
        if (args.collection === 'portfolios' && args.data) {
            const { id, ...cleanData } = args.data
            console.log('[Payload] Stripped ID from portfolios update:', id)
            args.data = cleanData
        }
        return originalUpdate(args)
    }
}
