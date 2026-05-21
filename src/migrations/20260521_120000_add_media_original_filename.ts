import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// FRH-52 phase A: preserve the user's original upload name alongside the
// slugified `filename` we store on disk. Backfills existing rows from
// `filename` so callers never see NULL post-migration.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."media"
      ADD COLUMN IF NOT EXISTS "original_filename" varchar;
    UPDATE "public"."media"
      SET "original_filename" = "filename"
      WHERE "original_filename" IS NULL AND "filename" IS NOT NULL;
    CREATE INDEX IF NOT EXISTS "media_original_filename_idx"
      ON "public"."media" ("original_filename");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."media_original_filename_idx";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "original_filename";
  `)
}
