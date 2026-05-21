import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "storage_path" varchar;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "processing_step" varchar DEFAULT 'upload_complete';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "storage_path";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "processing_step";
  `)
}
