import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transfer_wallpapers" DROP CONSTRAINT IF EXISTS "transfer_wallpapers_media_id_media_id_fk";
   ALTER TABLE "transfer_wallpapers" DROP CONSTRAINT IF EXISTS "transfer_wallpapers_mobile_media_id_media_id_fk";
   DROP INDEX IF EXISTS "transfer_wallpapers_media_idx";
   DROP INDEX IF EXISTS "transfer_wallpapers_mobile_media_idx";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "media_id";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "mobile_media_id";
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "url" varchar;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "thumbnail_u_r_l" varchar;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "filename" varchar;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "mime_type" varchar;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "filesize" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "width" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "height" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "focal_x" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "focal_y" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_url" varchar;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_width" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_height" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_mime_type" varchar;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_filesize" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_thumbnail_filename" varchar;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_desktop_url" varchar;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_desktop_width" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_desktop_height" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_desktop_mime_type" varchar;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_desktop_filesize" numeric;
   ALTER TABLE "transfer_wallpapers" ADD COLUMN IF NOT EXISTS "sizes_desktop_filename" varchar;
   CREATE UNIQUE INDEX IF NOT EXISTS "transfer_wallpapers_filename_idx" ON "transfer_wallpapers" USING btree ("filename");
   CREATE INDEX IF NOT EXISTS "transfer_wallpapers_sizes_thumbnail_filename_idx" ON "transfer_wallpapers" USING btree ("sizes_thumbnail_filename");
   CREATE INDEX IF NOT EXISTS "transfer_wallpapers_sizes_desktop_filename_idx" ON "transfer_wallpapers" USING btree ("sizes_desktop_filename");
`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "transfer_wallpapers_sizes_desktop_filename_idx";
   DROP INDEX IF EXISTS "transfer_wallpapers_sizes_thumbnail_filename_idx";
   DROP INDEX IF EXISTS "transfer_wallpapers_filename_idx";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_filename";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_filesize";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_mime_type";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_height";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_width";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_desktop_url";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_filename";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_filesize";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_mime_type";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_height";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_width";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "sizes_thumbnail_url";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "focal_y";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "focal_x";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "height";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "width";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "filesize";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "mime_type";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "filename";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "thumbnail_u_r_l";
   ALTER TABLE "transfer_wallpapers" DROP COLUMN IF EXISTS "url";
`)
}
