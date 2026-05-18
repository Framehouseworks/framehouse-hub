import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. Create Archival Sequence Column
    -- We use numeric to align with Payload's number field standard
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "archival_sequence" numeric;
    
    -- 2. Establish Unique Index for Provenance Integrity
    CREATE UNIQUE INDEX IF NOT EXISTS "media_archival_sequence_idx" ON "public"."media" USING btree ("archival_sequence");

    -- 3. Create Global Archival Sequence
    -- This provides the atomic 'Simple Counter' (1, 2, 3...) for scalable cataloging
    CREATE SEQUENCE IF NOT EXISTS global_archival_sequence START WITH 1;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "media_archival_sequence_idx";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "archival_sequence";
    DROP SEQUENCE IF EXISTS global_archival_sequence;
  `)
}
