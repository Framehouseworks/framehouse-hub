import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
    // 1. Get or Create "General" Folder
    const folders = await payload.find({
        collection: 'payload-folders',
        where: {
            name: {
                equals: 'General',
            },
        },
        limit: 1,
    })

    let folderId: string | number

    if (folders.docs.length > 0) {
        folderId = folders.docs[0].id
    } else {
        const newFolder = await payload.create({
            collection: 'payload-folders',
            data: {
                name: 'General',
            },
        })
        folderId = newFolder.id
    }

    // 2. Update all portfolios with NULL folder_id to use this folderId
    await db.execute(sql`UPDATE "portfolios" SET "folder_id" = ${folderId} WHERE "folder_id" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
    // We don't necessarily want to undo this as it might orphan records
}
