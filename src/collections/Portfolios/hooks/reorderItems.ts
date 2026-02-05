import { CollectionBeforeChangeHook } from 'payload'

export const reorderItems: CollectionBeforeChangeHook = ({ data }) => {
    if (data?.layoutBlocks && Array.isArray(data.layoutBlocks)) {
        data.layoutBlocks = data.layoutBlocks.map((block: any) => {
            if (block.blockType === 'grid') {
                // 1. IDENTITY GUARDIANSHIP: Ensure every item has a persistent instanceId
                const items = block.items || []
                items.forEach((item: any, index: number) => {
                    if (!item.instanceId) {
                        item.instanceId = `inst_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
                    }
                })

                // 2. REORDER LOGIC: Only reorder if a manifest (itemsOrder) exists
                if (block.itemsOrder) {
                    try {
                        const order = JSON.parse(block.itemsOrder)
                        if (Array.isArray(order)) {
                            const itemsMap = new Map()
                            items.forEach((item: any) => itemsMap.set(item.instanceId, item))

                            const orderedItems: any[] = []

                            // Follow manifest order
                            order.forEach((id: string) => {
                                if (itemsMap.has(id)) {
                                    orderedItems.push(itemsMap.get(id))
                                    itemsMap.delete(id)
                                }
                            })

                            // Append any missing items (not in manifest)
                            itemsMap.forEach((item) => orderedItems.push(item))

                            block.items = orderedItems
                        }
                    } catch (e) {
                        console.error('[reorderItems Hook] Failed to parse itemsOrder:', e)
                    }
                }
            }
            return block
        })
    }

    return data
}
