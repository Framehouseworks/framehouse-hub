import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. Establish Archival Accession Column
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "accession_id" text;
    
    -- 2. Establish Unique Archival Index
    -- Ensures museum-grade uniqueness across the entire collection
    CREATE UNIQUE INDEX IF NOT EXISTS "media_accession_id_idx" ON "public"."media" USING btree ("accession_id");

    -- 3. Initialize Atomic Sequences
    -- These provide the source-of-truth for sequential cataloging
    CREATE SEQUENCE IF NOT EXISTS accession_id_seq_2024 START WITH 1;
    CREATE SEQUENCE IF NOT EXISTS accession_id_seq_2025 START WITH 1;
    CREATE SEQUENCE IF NOT EXISTS accession_id_seq_2026 START WITH 1;

    -- 4. Infrastructure Stability: Relational Constraint Alignment
    -- Resolve potential pages_blocks_cta_links constraint conflicts
    -- Ensures the 'id' column satisfies Postgres Primary Key requirements
    DO $$ BEGIN
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pages_blocks_cta_links') THEN
        ALTER TABLE "public"."pages_blocks_cta_links" ALTER COLUMN "id" SET NOT NULL;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "media_accession_id_idx";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "accession_id";
    DROP SEQUENCE IF EXISTS accession_id_seq_2024;
    DROP SEQUENCE IF EXISTS accession_id_seq_2025;
    DROP SEQUENCE IF EXISTS accession_id_seq_2026;
  `)
}
