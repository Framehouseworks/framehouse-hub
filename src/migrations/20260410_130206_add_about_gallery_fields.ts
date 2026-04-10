import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_sprocket_divider_background_color" AS ENUM('white', 'surface_low');
  CREATE TYPE "public"."enum_pages_blocks_sprocket_divider_speed" AS ENUM('slow', 'medium', 'fast');
  CREATE TYPE "public"."enum__pages_v_blocks_sprocket_divider_background_color" AS ENUM('white', 'surface_low');
  CREATE TYPE "public"."enum__pages_v_blocks_sprocket_divider_speed" AS ENUM('slow', 'medium', 'fast');
  CREATE TABLE "pages_blocks_sprocket_divider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background_color" "enum_pages_blocks_sprocket_divider_background_color" DEFAULT 'white',
  	"speed" "enum_pages_blocks_sprocket_divider_speed" DEFAULT 'medium',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_sprocket_divider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background_color" "enum__pages_v_blocks_sprocket_divider_background_color" DEFAULT 'white',
  	"speed" "enum__pages_v_blocks_sprocket_divider_speed" DEFAULT 'medium',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_content_columns" ADD COLUMN "media_id" integer;
  ALTER TABLE "_pages_v_blocks_content_columns" ADD COLUMN "media_id" integer;
  ALTER TABLE "pages_blocks_sprocket_divider" ADD CONSTRAINT "pages_blocks_sprocket_divider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_sprocket_divider" ADD CONSTRAINT "_pages_v_blocks_sprocket_divider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_sprocket_divider_order_idx" ON "pages_blocks_sprocket_divider" USING btree ("_order");
  CREATE INDEX "pages_blocks_sprocket_divider_parent_id_idx" ON "pages_blocks_sprocket_divider" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_sprocket_divider_path_idx" ON "pages_blocks_sprocket_divider" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_sprocket_divider_order_idx" ON "_pages_v_blocks_sprocket_divider" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_sprocket_divider_parent_id_idx" ON "_pages_v_blocks_sprocket_divider" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_sprocket_divider_path_idx" ON "_pages_v_blocks_sprocket_divider" USING btree ("_path");
  ALTER TABLE "pages_blocks_content_columns" ADD CONSTRAINT "pages_blocks_content_columns_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_content_columns" ADD CONSTRAINT "_pages_v_blocks_content_columns_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_content_columns_media_idx" ON "pages_blocks_content_columns" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_content_columns_media_idx" ON "_pages_v_blocks_content_columns" USING btree ("media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_sprocket_divider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_sprocket_divider" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_sprocket_divider" CASCADE;
  DROP TABLE "_pages_v_blocks_sprocket_divider" CASCADE;
  ALTER TABLE "pages_blocks_content_columns" DROP CONSTRAINT "pages_blocks_content_columns_media_id_media_id_fk";
  
  ALTER TABLE "_pages_v_blocks_content_columns" DROP CONSTRAINT "_pages_v_blocks_content_columns_media_id_media_id_fk";
  
  DROP INDEX "pages_blocks_content_columns_media_idx";
  DROP INDEX "_pages_v_blocks_content_columns_media_idx";
  ALTER TABLE "pages_blocks_content_columns" DROP COLUMN "media_id";
  ALTER TABLE "_pages_v_blocks_content_columns" DROP COLUMN "media_id";
  DROP TYPE "public"."enum_pages_blocks_sprocket_divider_background_color";
  DROP TYPE "public"."enum_pages_blocks_sprocket_divider_speed";
  DROP TYPE "public"."enum__pages_v_blocks_sprocket_divider_background_color";
  DROP TYPE "public"."enum__pages_v_blocks_sprocket_divider_speed";`)
}
