import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_portfolios_blocks_grid_items_video_thumbnail_mode" AS ENUM('auto', 'timecode', 'custom');
  CREATE TYPE "public"."enum_portfolios_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__portfolios_v_blocks_grid_items_size" AS ENUM('small', 'medium', 'large', 'full');
  CREATE TYPE "public"."enum__portfolios_v_blocks_grid_items_video_thumbnail_mode" AS ENUM('auto', 'timecode', 'custom');
  CREATE TYPE "public"."enum__portfolios_v_blocks_grid_spacing" AS ENUM('small', 'medium', 'large', 'none');
  CREATE TYPE "public"."enum__portfolios_v_blocks_text_alignment" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__portfolios_v_blocks_spacer_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum__portfolios_v_version_visibility" AS ENUM('private', 'public', 'shared');
  CREATE TYPE "public"."enum__portfolios_v_version_theme_font_pairing" AS ENUM('modern-sans', 'classic-serif', 'tech-mono');
  CREATE TYPE "public"."enum__portfolios_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "_portfolios_v_blocks_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"size" "enum__portfolios_v_blocks_grid_items_size" DEFAULT 'medium',
  	"alt" varchar,
  	"caption" varchar,
  	"link" varchar,
  	"instance_id" varchar,
  	"instance_title" varchar,
  	"focal_point_x" numeric DEFAULT 50,
  	"focal_point_y" numeric DEFAULT 50,
  	"video_thumbnail_mode" "enum__portfolios_v_blocks_grid_items_video_thumbnail_mode" DEFAULT 'auto',
  	"video_thumbnail_timecode_seconds" numeric,
  	"video_thumbnail_custom_media_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_portfolios_v_blocks_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"spacing" "enum__portfolios_v_blocks_grid_spacing" DEFAULT 'medium',
  	"items_order" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_portfolios_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"content" jsonb,
  	"alignment" "enum__portfolios_v_blocks_text_alignment" DEFAULT 'left',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_portfolios_v_blocks_featured" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"media_id" integer,
  	"caption" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_portfolios_v_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"size" "enum__portfolios_v_blocks_spacer_size" DEFAULT 'medium',
  	"show_divider" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_portfolios_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_title" jsonb,
  	"version_subheading" jsonb,
  	"version_slug" varchar,
  	"version_owner_id" integer,
  	"version_visibility" "enum__portfolios_v_version_visibility" DEFAULT 'private',
  	"version_password" varchar,
  	"version_theme_font_pairing" "enum__portfolios_v_version_theme_font_pairing" DEFAULT 'modern-sans',
  	"version_theme_background_color" varchar DEFAULT '#000000',
  	"version_theme_text_color" varchar DEFAULT '#ffffff',
  	"version_theme_accent_color" varchar DEFAULT '#ffffff',
  	"version_folder_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__portfolios_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  ALTER TABLE "portfolios_blocks_text" ALTER COLUMN "content" DROP NOT NULL;
  ALTER TABLE "portfolios" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "portfolios" ALTER COLUMN "owner_id" DROP NOT NULL;
  ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN "instance_title" varchar;
  ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN "focal_point_x" numeric DEFAULT 50;
  ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN "focal_point_y" numeric DEFAULT 50;
  ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN "video_thumbnail_mode" "enum_portfolios_blocks_grid_items_video_thumbnail_mode" DEFAULT 'auto';
  ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN "video_thumbnail_timecode_seconds" numeric;
  ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN "video_thumbnail_custom_media_id" integer;
  ALTER TABLE "portfolios" ADD COLUMN "_status" "enum_portfolios_status" DEFAULT 'draft';
  ALTER TABLE "_portfolios_v_blocks_grid_items" ADD CONSTRAINT "_portfolios_v_blocks_grid_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_portfolios_v_blocks_grid_items" ADD CONSTRAINT "_portfolios_v_blocks_grid_items_video_thumbnail_custom_media_id_media_id_fk" FOREIGN KEY ("video_thumbnail_custom_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_portfolios_v_blocks_grid_items" ADD CONSTRAINT "_portfolios_v_blocks_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_portfolios_v_blocks_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_portfolios_v_blocks_grid" ADD CONSTRAINT "_portfolios_v_blocks_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_portfolios_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_portfolios_v_blocks_text" ADD CONSTRAINT "_portfolios_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_portfolios_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_portfolios_v_blocks_featured" ADD CONSTRAINT "_portfolios_v_blocks_featured_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_portfolios_v_blocks_featured" ADD CONSTRAINT "_portfolios_v_blocks_featured_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_portfolios_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_portfolios_v_blocks_spacer" ADD CONSTRAINT "_portfolios_v_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_portfolios_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_portfolios_v" ADD CONSTRAINT "_portfolios_v_parent_id_portfolios_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."portfolios"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_portfolios_v" ADD CONSTRAINT "_portfolios_v_version_owner_id_users_id_fk" FOREIGN KEY ("version_owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_portfolios_v" ADD CONSTRAINT "_portfolios_v_version_folder_id_payload_folders_id_fk" FOREIGN KEY ("version_folder_id") REFERENCES "public"."payload_folders"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "_portfolios_v_blocks_grid_items_order_idx" ON "_portfolios_v_blocks_grid_items" USING btree ("_order");
  CREATE INDEX "_portfolios_v_blocks_grid_items_parent_id_idx" ON "_portfolios_v_blocks_grid_items" USING btree ("_parent_id");
  CREATE INDEX "_portfolios_v_blocks_grid_items_media_idx" ON "_portfolios_v_blocks_grid_items" USING btree ("media_id");
  CREATE INDEX "_portfolios_v_blocks_grid_items_video_thumbnail_video_th_idx" ON "_portfolios_v_blocks_grid_items" USING btree ("video_thumbnail_custom_media_id");
  CREATE INDEX "_portfolios_v_blocks_grid_order_idx" ON "_portfolios_v_blocks_grid" USING btree ("_order");
  CREATE INDEX "_portfolios_v_blocks_grid_parent_id_idx" ON "_portfolios_v_blocks_grid" USING btree ("_parent_id");
  CREATE INDEX "_portfolios_v_blocks_grid_path_idx" ON "_portfolios_v_blocks_grid" USING btree ("_path");
  CREATE INDEX "_portfolios_v_blocks_text_order_idx" ON "_portfolios_v_blocks_text" USING btree ("_order");
  CREATE INDEX "_portfolios_v_blocks_text_parent_id_idx" ON "_portfolios_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "_portfolios_v_blocks_text_path_idx" ON "_portfolios_v_blocks_text" USING btree ("_path");
  CREATE INDEX "_portfolios_v_blocks_featured_order_idx" ON "_portfolios_v_blocks_featured" USING btree ("_order");
  CREATE INDEX "_portfolios_v_blocks_featured_parent_id_idx" ON "_portfolios_v_blocks_featured" USING btree ("_parent_id");
  CREATE INDEX "_portfolios_v_blocks_featured_path_idx" ON "_portfolios_v_blocks_featured" USING btree ("_path");
  CREATE INDEX "_portfolios_v_blocks_featured_media_idx" ON "_portfolios_v_blocks_featured" USING btree ("media_id");
  CREATE INDEX "_portfolios_v_blocks_spacer_order_idx" ON "_portfolios_v_blocks_spacer" USING btree ("_order");
  CREATE INDEX "_portfolios_v_blocks_spacer_parent_id_idx" ON "_portfolios_v_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "_portfolios_v_blocks_spacer_path_idx" ON "_portfolios_v_blocks_spacer" USING btree ("_path");
  CREATE INDEX "_portfolios_v_parent_idx" ON "_portfolios_v" USING btree ("parent_id");
  CREATE INDEX "_portfolios_v_version_version_slug_idx" ON "_portfolios_v" USING btree ("version_slug");
  CREATE INDEX "_portfolios_v_version_version_owner_idx" ON "_portfolios_v" USING btree ("version_owner_id");
  CREATE INDEX "_portfolios_v_version_version_folder_idx" ON "_portfolios_v" USING btree ("version_folder_id");
  CREATE INDEX "_portfolios_v_version_version_updated_at_idx" ON "_portfolios_v" USING btree ("version_updated_at");
  CREATE INDEX "_portfolios_v_version_version_created_at_idx" ON "_portfolios_v" USING btree ("version_created_at");
  CREATE INDEX "_portfolios_v_version_version__status_idx" ON "_portfolios_v" USING btree ("version__status");
  CREATE INDEX "_portfolios_v_created_at_idx" ON "_portfolios_v" USING btree ("created_at");
  CREATE INDEX "_portfolios_v_updated_at_idx" ON "_portfolios_v" USING btree ("updated_at");
  CREATE INDEX "_portfolios_v_latest_idx" ON "_portfolios_v" USING btree ("latest");
  CREATE INDEX "_portfolios_v_autosave_idx" ON "_portfolios_v" USING btree ("autosave");
  ALTER TABLE "portfolios_blocks_grid_items" ADD CONSTRAINT "portfolios_blocks_grid_items_video_thumbnail_custom_media_id_media_id_fk" FOREIGN KEY ("video_thumbnail_custom_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "portfolios_blocks_grid_items_video_thumbnail_video_thumb_idx" ON "portfolios_blocks_grid_items" USING btree ("video_thumbnail_custom_media_id");
  CREATE INDEX "portfolios__status_idx" ON "portfolios" USING btree ("_status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_portfolios_v_blocks_grid_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_portfolios_v_blocks_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_portfolios_v_blocks_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_portfolios_v_blocks_featured" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_portfolios_v_blocks_spacer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_portfolios_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_portfolios_v_blocks_grid_items" CASCADE;
  DROP TABLE "_portfolios_v_blocks_grid" CASCADE;
  DROP TABLE "_portfolios_v_blocks_text" CASCADE;
  DROP TABLE "_portfolios_v_blocks_featured" CASCADE;
  DROP TABLE "_portfolios_v_blocks_spacer" CASCADE;
  DROP TABLE "_portfolios_v" CASCADE;
  ALTER TABLE "portfolios_blocks_grid_items" DROP CONSTRAINT "portfolios_blocks_grid_items_video_thumbnail_custom_media_id_media_id_fk";
  
  DROP INDEX "portfolios_blocks_grid_items_video_thumbnail_video_thumb_idx";
  DROP INDEX "portfolios__status_idx";
  ALTER TABLE "portfolios_blocks_text" ALTER COLUMN "content" SET NOT NULL;
  ALTER TABLE "portfolios" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "portfolios" ALTER COLUMN "owner_id" SET NOT NULL;
  ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN "instance_title";
  ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN "focal_point_x";
  ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN "focal_point_y";
  ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN "video_thumbnail_mode";
  ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN "video_thumbnail_timecode_seconds";
  ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN "video_thumbnail_custom_media_id";
  ALTER TABLE "portfolios" DROP COLUMN "_status";
  DROP TYPE "public"."enum_portfolios_blocks_grid_items_video_thumbnail_mode";
  DROP TYPE "public"."enum_portfolios_status";
  DROP TYPE "public"."enum__portfolios_v_blocks_grid_items_size";
  DROP TYPE "public"."enum__portfolios_v_blocks_grid_items_video_thumbnail_mode";
  DROP TYPE "public"."enum__portfolios_v_blocks_grid_spacing";
  DROP TYPE "public"."enum__portfolios_v_blocks_text_alignment";
  DROP TYPE "public"."enum__portfolios_v_blocks_spacer_size";
  DROP TYPE "public"."enum__portfolios_v_version_visibility";
  DROP TYPE "public"."enum__portfolios_v_version_theme_font_pairing";
  DROP TYPE "public"."enum__portfolios_v_version_status";`)
}
