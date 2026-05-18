import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. Create Shoot Name Column
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "shoot_name" text;
    
    -- 2. Create Index for Rapid Batch Grouping & Filtering
    CREATE INDEX IF NOT EXISTS "media_shoot_name_idx" ON "public"."media" USING btree ("shoot_name");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "media_shoot_name_idx";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "shoot_name";
  `)
}
