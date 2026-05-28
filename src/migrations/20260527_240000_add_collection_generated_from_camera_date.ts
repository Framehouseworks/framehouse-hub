import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// FRH-47: Add 'camera' and 'date' values to the generatedFrom enum so
// autoGenerateCollections can categorise camera-body and date-period
// collections separately from the catch-all 'metadata' bucket.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_smart_collections_generated_from"
      ADD VALUE IF NOT EXISTS 'camera';
    ALTER TYPE "public"."enum_smart_collections_generated_from"
      ADD VALUE IF NOT EXISTS 'date';
  `)
}

// Postgres does not support dropping enum values — down is intentionally a no-op.
export async function down(_args: MigrateDownArgs): Promise<void> {}
