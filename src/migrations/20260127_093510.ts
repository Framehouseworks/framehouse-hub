import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_portfolios_blocks_grid_size_mode" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_portfolios_blocks_grid_spacing" AS ENUM('small', 'medium', 'large', 'none');
  CREATE TYPE "public"."enum_portfolios_theme_font_pairing" AS ENUM('modern-sans', 'classic-serif', 'tech-mono');
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_optimized_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_optimized_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_optimized_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_optimized_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_optimized_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_optimized_filename" varchar;
  ALTER TABLE "portfolios_blocks_grid" ADD COLUMN "size_mode" "enum_portfolios_blocks_grid_size_mode" DEFAULT 'medium';
  ALTER TABLE "portfolios_blocks_grid" ADD COLUMN "spacing" "enum_portfolios_blocks_grid_spacing" DEFAULT 'medium';
  ALTER TABLE "portfolios_blocks_featured" ADD COLUMN "parallax_effect" boolean DEFAULT false;
  ALTER TABLE "portfolios" ADD COLUMN "theme_font_pairing" "enum_portfolios_theme_font_pairing" DEFAULT 'modern-sans';
  ALTER TABLE "portfolios" ADD COLUMN "theme_background_color" varchar DEFAULT '#000000';
  ALTER TABLE "portfolios" ADD COLUMN "theme_text_color" varchar DEFAULT '#ffffff';
  ALTER TABLE "portfolios" ADD COLUMN "theme_accent_color" varchar DEFAULT '#ffffff';
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_optimized_sizes_optimized_filename_idx" ON "media" USING btree ("sizes_optimized_filename");
  ALTER TABLE "portfolios_blocks_grid" DROP COLUMN "columns";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx";
  DROP INDEX "media_sizes_optimized_sizes_optimized_filename_idx";
  ALTER TABLE "portfolios_blocks_grid" ADD COLUMN "columns" numeric DEFAULT 3;
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_url";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_width";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_height";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_optimized_url";
  ALTER TABLE "media" DROP COLUMN "sizes_optimized_width";
  ALTER TABLE "media" DROP COLUMN "sizes_optimized_height";
  ALTER TABLE "media" DROP COLUMN "sizes_optimized_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_optimized_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_optimized_filename";
  ALTER TABLE "portfolios_blocks_grid" DROP COLUMN "size_mode";
  ALTER TABLE "portfolios_blocks_grid" DROP COLUMN "spacing";
  ALTER TABLE "portfolios_blocks_featured" DROP COLUMN "parallax_effect";
  ALTER TABLE "portfolios" DROP COLUMN "theme_font_pairing";
  ALTER TABLE "portfolios" DROP COLUMN "theme_background_color";
  ALTER TABLE "portfolios" DROP COLUMN "theme_text_color";
  ALTER TABLE "portfolios" DROP COLUMN "theme_accent_color";
  DROP TYPE "public"."enum_portfolios_blocks_grid_size_mode";
  DROP TYPE "public"."enum_portfolios_blocks_grid_spacing";
  DROP TYPE "public"."enum_portfolios_theme_font_pairing";`)
}
