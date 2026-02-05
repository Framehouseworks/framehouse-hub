import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';

export async function up({ payload }: MigrateUpArgs): Promise<void> {
    const portfolios = await payload.find({
        collection: 'portfolios',
        limit: 1000,
    })

    payload.logger.info(`Starting Independent Identity Migration for ${portfolios.totalDocs} portfolios...`)

    for (const doc of portfolios.docs) {
        let hasChanges = false;

        // @ts-ignore
        const newLayoutBlocks = (doc.layoutBlocks || []).map((block) => {
            if (block.blockType === 'grid') {
                const items = block.items || [];

                // 1. Generate NEW Independent UUIDs for every item
                // We do NOT trust the old instanceId because it might be linked to a mutable Payload ID
                const newItems = items.map((item) => {
                    // Generate a truly random UUID that has no relation to database row IDs
                    const independentId = `inst_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
                    return {
                        ...item,
                        instanceId: independentId,
                    }
                });

                // 2. Regenerate Manifest relying ONLY on the new Independent IDs
                // Since we mapped the items in their current physical order, the new manifest
                // simply follows that order.
                const newManifest = newItems.map(i => i.instanceId);

                hasChanges = true;
                return {
                    ...block,
                    items: newItems,
                    itemsOrder: JSON.stringify(newManifest),
                }
            }
            return block;
        });

        if (hasChanges) {
            payload.logger.info(`--> Migrating Identity for Portfolio: ${doc.title} (${doc.id})`);
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

    payload.logger.info('Independent Identity Migration Complete.');
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
    // No-op: Identity rotation is a one-way security upgrade.
}
