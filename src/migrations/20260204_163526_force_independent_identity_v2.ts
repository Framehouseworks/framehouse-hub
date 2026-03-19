import { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres';

export async function up({ payload }: MigrateUpArgs): Promise<void> {
    const portfolios = await payload.find({
        collection: 'portfolios',
        limit: 1000,
    })

    payload.logger.info(`Starting Forced Independent Identity Migration V2 for ${portfolios.totalDocs} portfolios...`)

    for (const doc of portfolios.docs) {
        let hasChanges = false;

        // @ts-ignore
        const newLayoutBlocks = (doc.layoutBlocks || []).map((block) => {
            if (block.blockType === 'grid') {
                const items = block.items || [];

                // RE-RUN THE LOGIC: Generate fresh independent UUIDs
                const newItems = items.map((item) => {
                    const independentId = `inst_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
                    return {
                        ...item,
                        instanceId: independentId,
                    }
                });

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
            payload.logger.info(`--> Forced Migration V2: Updating Portfolio: ${doc.title} (${doc.id})`);
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

    payload.logger.info('Forced Independent Identity Migration V2 Complete.');
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
    // No-op
}
