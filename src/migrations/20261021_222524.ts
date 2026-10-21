import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "transfer_wallpapers_sizes_thumbnail_sizes_thumbnail_file_idx";
  DROP INDEX IF EXISTS "transfer_wallpapers_sizes_desktop_sizes_desktop_filename_idx";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_url";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_width";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_height";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_mime_type";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_filesize";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_filename";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_url";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_width";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_height";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_mime_type";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_filesize";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_filename";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_thumbnail_url" varchar;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_thumbnail_width" numeric;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_thumbnail_height" numeric;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_thumbnail_mime_type" varchar;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_thumbnail_filesize" numeric;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_thumbnail_filename" varchar;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_desktop_url" varchar;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_desktop_width" numeric;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_desktop_height" numeric;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_desktop_mime_type" varchar;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_desktop_filesize" numeric;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "sizes_desktop_filename" varchar;
  CREATE INDEX "transfer_wallpapers_sizes_thumbnail_sizes_thumbnail_file_idx" ON "transfer_wallpapers" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "transfer_wallpapers_sizes_desktop_sizes_desktop_filename_idx" ON "transfer_wallpapers" USING btree ("sizes_desktop_filename");`)
}
