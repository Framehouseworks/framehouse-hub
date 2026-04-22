import { CollectionBeforeChangeHook } from 'payload'

export const reorderItems: CollectionBeforeChangeHook = ({ data }) => {
    if (data?.layoutBlocks && Array.isArray(data.layoutBlocks)) {
        data.layoutBlocks = data.layoutBlocks.map((block: Record<string, unknown>) => {
            if (block.blockType === 'grid') {
                // 1. IDENTITY GUARDIANSHIP: Ensure every item has a persistent instanceId
                const items = (block.items as Record<string, unknown>[]) || []
                items.forEach((item: Record<string, unknown>) => {
                    const currentId = (item.instanceId as string) || (item.instance_id as string)
                    if (!currentId) {
                        item.instanceId = `inst_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
                    } else if (!item.instanceId && item.instance_id) {
                        item.instanceId = item.instance_id
                    }
                })

                // 2. REORDER LOGIC: Only reorder if a manifest (itemsOrder) exists
                if (block.itemsOrder) {
                    try {
                        const order = JSON.parse(block.itemsOrder as string)
                        if (Array.isArray(order)) {
                            const itemsMap = new Map<string, Record<string, unknown>>()
                            items.forEach((item: Record<string, unknown>) => itemsMap.set(item.instanceId as string, item))

                            const orderedItems: Record<string, unknown>[] = []

                            // Follow manifest order
                            order.forEach((id: string) => {
                                if (itemsMap.has(id)) {
                                    orderedItems.push(itemsMap.get(id)!)
                                    itemsMap.delete(id)
                                }
                            })

                            // Append any missing items (not in manifest)
                            itemsMap.forEach((item) => orderedItems.push(item))

                            block.items = orderedItems
                        }
                    } catch (_) {
                        console.error('[reorderItems Hook] Failed to parse itemsOrder')
                    }
                }
            }
            return block
        })
    }

    return data
}
