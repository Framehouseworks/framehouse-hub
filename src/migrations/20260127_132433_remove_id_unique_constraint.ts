import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
    // 1. Drop unique constraints on block/array item tables if they exist
    // This allows updates to existing items without "id must be unique" errors
    await db.execute(sql`
        DO $$ 
        DECLARE
            r RECORD;
        BEGIN
            -- Find all unique constraints ending in _id_unique on portfolios_ related tables
            FOR r IN 
                SELECT conname, conrelid::regclass AS table_name
                FROM pg_constraint
                WHERE conname LIKE '%_id_unique' 
                AND conrelid::regclass::text LIKE 'portfolios_%'
            LOOP
                EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_name, r.conname);
            END LOOP;
        END $$;
    `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
    // We do NOT restore the constraints as they are the source of the bug
    console.log('Skipping restoration of ID unique constraints')
}
