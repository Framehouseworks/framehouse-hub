import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';

export async function up({ payload }: MigrateUpArgs): Promise<void> {
    const portfolios = await payload.find({
        collection: 'portfolios',
        limit: 1000,
    })

    payload.logger.info(`Starting Shadow Order Backfill for ${portfolios.totalDocs} portfolios...`)

    for (const doc of portfolios.docs) {
        let hasChanges = false;

        // Check layoutBlocks
        // @ts-ignore
        const newLayoutBlocks = (doc.layoutBlocks || []).map((block) => {
            if (block.blockType === 'grid') {
                const items = block.items || [];
                const currentOrder = block.itemsOrder ? JSON.parse(block.itemsOrder) : [];
                let itemsChanged = false;

                // 1. Backfill instanceId
                const newItems = items.map((item, index) => {
                    if (!item.instanceId) {
                        // Use existing ID if available, otherwise generate a stable one
                        const stableId = item.id || `migrated-${Date.now()}-${index}`;
                        itemsChanged = true;
                        return {
                            ...item,
                            instanceId: stableId,
                        }
                    }
                    return item;
                });

                // 2. Generate Manifest if missing
                if (!block.itemsOrder || itemsChanged) {
                    const newManifest = newItems.map(i => i.instanceId).filter(Boolean);
                    hasChanges = true;
                    return {
                        ...block,
                        items: newItems,
                        itemsOrder: JSON.stringify(newManifest),
                    }
                }
            }
            return block;
        });

        if (hasChanges) {
            payload.logger.info(`--> Updating Portfolio: ${doc.title} (${doc.id})`);
            await payload.update({
                collection: 'portfolios',
                id: doc.id,
                data: {
                    // @ts-ignore
                    layoutBlocks: newLayoutBlocks,
                },
            });
        }
    }

    payload.logger.info('Shadow Order Backfill Complete.');
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
    // No-op: We don't want to destroy data on rollback, just leaving the extra fields is fine.
    payload.logger.info('No rollback action for data backfill.');
}
