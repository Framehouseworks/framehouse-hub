import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_content_style" AS ENUM('default', 'mission');
  CREATE TYPE "public"."enum_pages_blocks_three_item_grid_style" AS ENUM('default', 'pillars');
  CREATE TYPE "public"."enum__pages_v_blocks_content_style" AS ENUM('default', 'mission');
  CREATE TYPE "public"."enum__pages_v_blocks_three_item_grid_style" AS ENUM('default', 'pillars');
  CREATE TABLE "pages_blocks_three_item_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"media_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_three_item_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"media_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "header_nav_items_sub_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_description" varchar
  );
  
  ALTER TABLE "header_nav_items" ALTER COLUMN "link_label" DROP NOT NULL;
  ALTER TABLE "pages_blocks_content" ADD COLUMN "style" "enum_pages_blocks_content_style" DEFAULT 'default';
  ALTER TABLE "pages_blocks_three_item_grid" ADD COLUMN "style" "enum_pages_blocks_three_item_grid_style" DEFAULT 'default';
  ALTER TABLE "_pages_v_blocks_content" ADD COLUMN "style" "enum__pages_v_blocks_content_style" DEFAULT 'default';
  ALTER TABLE "_pages_v_blocks_three_item_grid" ADD COLUMN "style" "enum__pages_v_blocks_three_item_grid_style" DEFAULT 'default';
  ALTER TABLE "header_nav_items" ADD COLUMN "group" boolean DEFAULT false;
  ALTER TABLE "header_nav_items" ADD COLUMN "menu_title" varchar;
  ALTER TABLE "pages_blocks_three_item_grid_items" ADD CONSTRAINT "pages_blocks_three_item_grid_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_three_item_grid_items" ADD CONSTRAINT "pages_blocks_three_item_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_three_item_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_three_item_grid_items" ADD CONSTRAINT "_pages_v_blocks_three_item_grid_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_three_item_grid_items" ADD CONSTRAINT "_pages_v_blocks_three_item_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_three_item_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_nav_items_sub_items" ADD CONSTRAINT "header_nav_items_sub_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header_nav_items"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_three_item_grid_items_order_idx" ON "pages_blocks_three_item_grid_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_three_item_grid_items_parent_id_idx" ON "pages_blocks_three_item_grid_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_three_item_grid_items_media_idx" ON "pages_blocks_three_item_grid_items" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_three_item_grid_items_order_idx" ON "_pages_v_blocks_three_item_grid_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_three_item_grid_items_parent_id_idx" ON "_pages_v_blocks_three_item_grid_items" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_three_item_grid_items_media_idx" ON "_pages_v_blocks_three_item_grid_items" USING btree ("media_id");
  CREATE INDEX "header_nav_items_sub_items_order_idx" ON "header_nav_items_sub_items" USING btree ("_order");
  CREATE INDEX "header_nav_items_sub_items_parent_id_idx" ON "header_nav_items_sub_items" USING btree ("_parent_id");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_three_item_grid_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_three_item_grid_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "header_nav_items_sub_items" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_three_item_grid_items" CASCADE;
  DROP TABLE "_pages_v_blocks_three_item_grid_items" CASCADE;
  DROP TABLE "header_nav_items_sub_items" CASCADE;
  ALTER TABLE "header_nav_items" ALTER COLUMN "link_label" SET NOT NULL;
  ALTER TABLE "pages_blocks_content" DROP COLUMN "style";
  ALTER TABLE "pages_blocks_three_item_grid" DROP COLUMN "style";
  ALTER TABLE "_pages_v_blocks_content" DROP COLUMN "style";
  ALTER TABLE "_pages_v_blocks_three_item_grid" DROP COLUMN "style";
  ALTER TABLE "header_nav_items" DROP COLUMN "group";
  ALTER TABLE "header_nav_items" DROP COLUMN "menu_title";
  DROP TYPE "public"."enum_pages_blocks_content_style";
  DROP TYPE "public"."enum_pages_blocks_three_item_grid_style";
  DROP TYPE "public"."enum__pages_v_blocks_content_style";
  DROP TYPE "public"."enum__pages_v_blocks_three_item_grid_style";`)
}
