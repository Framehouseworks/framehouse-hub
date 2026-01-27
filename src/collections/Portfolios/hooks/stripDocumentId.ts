import type { CollectionBeforeChangeHook } from 'payload'

// Hook to strip the top-level document ID from update payloads
export const stripDocumentId: CollectionBeforeChangeHook = ({ data, operation }) => {
    if (operation === 'update' && data) {
        // Create a new object without the id field
        const { id, ...cleanData } = data
        return cleanData
    }
    return data
}
