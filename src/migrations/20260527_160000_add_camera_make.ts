import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// FRH-47: Split camera make from model in technical metadata group.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."media"
      ADD COLUMN IF NOT EXISTS "technical_camera_make" varchar;

    CREATE INDEX IF NOT EXISTS "media_technical_camera_make_idx"
      ON "public"."media" USING btree ("technical_camera_make");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."media_technical_camera_make_idx";
    ALTER TABLE "public"."media"
      DROP COLUMN IF EXISTS "technical_camera_make";
  `)
}
