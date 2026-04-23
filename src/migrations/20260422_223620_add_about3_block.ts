import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_pages_blocks_content_layout_style" ADD VALUE 'side_by_side';
  ALTER TYPE "public"."enum__pages_v_blocks_content_layout_style" ADD VALUE 'side_by_side';
  CREATE TABLE "pages_blocks_about3_companies" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer
  );
  
  CREATE TABLE "pages_blocks_about3_achievements" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "pages_blocks_about3_content_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"content" varchar,
  	"media_id" integer
  );
  
  CREATE TABLE "pages_blocks_about3" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'About Us',
  	"description" varchar DEFAULT 'We are a passionate team dedicated to creating innovative solutions that empower businesses to thrive in the digital age.',
  	"main_image_id" integer,
  	"secondary_image_id" integer,
  	"breakout_logo_id" integer,
  	"breakout_title" varchar,
  	"breakout_description" varchar,
  	"breakout_button_text" varchar,
  	"breakout_button_url" varchar,
  	"achievements_title" varchar DEFAULT 'Our Achievements in Numbers',
  	"achievements_description" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_about3_companies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_about3_achievements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_about3_content_sections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"content" varchar,
  	"media_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_about3" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'About Us',
  	"description" varchar DEFAULT 'We are a passionate team dedicated to creating innovative solutions that empower businesses to thrive in the digital age.',
  	"main_image_id" integer,
  	"secondary_image_id" integer,
  	"breakout_logo_id" integer,
  	"breakout_title" varchar,
  	"breakout_description" varchar,
  	"breakout_button_text" varchar,
  	"breakout_button_url" varchar,
  	"achievements_title" varchar DEFAULT 'Our Achievements in Numbers',
  	"achievements_description" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_about3_companies" ADD CONSTRAINT "pages_blocks_about3_companies_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_about3_companies" ADD CONSTRAINT "pages_blocks_about3_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_about3"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_about3_achievements" ADD CONSTRAINT "pages_blocks_about3_achievements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_about3"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_about3_content_sections" ADD CONSTRAINT "pages_blocks_about3_content_sections_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_about3_content_sections" ADD CONSTRAINT "pages_blocks_about3_content_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_about3"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_about3" ADD CONSTRAINT "pages_blocks_about3_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_about3" ADD CONSTRAINT "pages_blocks_about3_secondary_image_id_media_id_fk" FOREIGN KEY ("secondary_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_about3" ADD CONSTRAINT "pages_blocks_about3_breakout_logo_id_media_id_fk" FOREIGN KEY ("breakout_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_about3" ADD CONSTRAINT "pages_blocks_about3_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about3_companies" ADD CONSTRAINT "_pages_v_blocks_about3_companies_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about3_companies" ADD CONSTRAINT "_pages_v_blocks_about3_companies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_about3"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about3_achievements" ADD CONSTRAINT "_pages_v_blocks_about3_achievements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_about3"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about3_content_sections" ADD CONSTRAINT "_pages_v_blocks_about3_content_sections_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about3_content_sections" ADD CONSTRAINT "_pages_v_blocks_about3_content_sections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_about3"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about3" ADD CONSTRAINT "_pages_v_blocks_about3_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about3" ADD CONSTRAINT "_pages_v_blocks_about3_secondary_image_id_media_id_fk" FOREIGN KEY ("secondary_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about3" ADD CONSTRAINT "_pages_v_blocks_about3_breakout_logo_id_media_id_fk" FOREIGN KEY ("breakout_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_about3" ADD CONSTRAINT "_pages_v_blocks_about3_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_about3_companies_order_idx" ON "pages_blocks_about3_companies" USING btree ("_order");
  CREATE INDEX "pages_blocks_about3_companies_parent_id_idx" ON "pages_blocks_about3_companies" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_about3_companies_logo_idx" ON "pages_blocks_about3_companies" USING btree ("logo_id");
  CREATE INDEX "pages_blocks_about3_achievements_order_idx" ON "pages_blocks_about3_achievements" USING btree ("_order");
  CREATE INDEX "pages_blocks_about3_achievements_parent_id_idx" ON "pages_blocks_about3_achievements" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_about3_content_sections_order_idx" ON "pages_blocks_about3_content_sections" USING btree ("_order");
  CREATE INDEX "pages_blocks_about3_content_sections_parent_id_idx" ON "pages_blocks_about3_content_sections" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_about3_content_sections_media_idx" ON "pages_blocks_about3_content_sections" USING btree ("media_id");
  CREATE INDEX "pages_blocks_about3_order_idx" ON "pages_blocks_about3" USING btree ("_order");
  CREATE INDEX "pages_blocks_about3_parent_id_idx" ON "pages_blocks_about3" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_about3_path_idx" ON "pages_blocks_about3" USING btree ("_path");
  CREATE INDEX "pages_blocks_about3_main_image_idx" ON "pages_blocks_about3" USING btree ("main_image_id");
  CREATE INDEX "pages_blocks_about3_secondary_image_idx" ON "pages_blocks_about3" USING btree ("secondary_image_id");
  CREATE INDEX "pages_blocks_about3_breakout_breakout_logo_idx" ON "pages_blocks_about3" USING btree ("breakout_logo_id");
  CREATE INDEX "_pages_v_blocks_about3_companies_order_idx" ON "_pages_v_blocks_about3_companies" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_about3_companies_parent_id_idx" ON "_pages_v_blocks_about3_companies" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_about3_companies_logo_idx" ON "_pages_v_blocks_about3_companies" USING btree ("logo_id");
  CREATE INDEX "_pages_v_blocks_about3_achievements_order_idx" ON "_pages_v_blocks_about3_achievements" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_about3_achievements_parent_id_idx" ON "_pages_v_blocks_about3_achievements" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_about3_content_sections_order_idx" ON "_pages_v_blocks_about3_content_sections" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_about3_content_sections_parent_id_idx" ON "_pages_v_blocks_about3_content_sections" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_about3_content_sections_media_idx" ON "_pages_v_blocks_about3_content_sections" USING btree ("media_id");
  CREATE INDEX "_pages_v_blocks_about3_order_idx" ON "_pages_v_blocks_about3" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_about3_parent_id_idx" ON "_pages_v_blocks_about3" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_about3_path_idx" ON "_pages_v_blocks_about3" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_about3_main_image_idx" ON "_pages_v_blocks_about3" USING btree ("main_image_id");
  CREATE INDEX "_pages_v_blocks_about3_secondary_image_idx" ON "_pages_v_blocks_about3" USING btree ("secondary_image_id");
  CREATE INDEX "_pages_v_blocks_about3_breakout_breakout_logo_idx" ON "_pages_v_blocks_about3" USING btree ("breakout_logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pages_blocks_about3_companies" CASCADE;
  DROP TABLE "pages_blocks_about3_achievements" CASCADE;
  DROP TABLE "pages_blocks_about3_content_sections" CASCADE;
  DROP TABLE "pages_blocks_about3" CASCADE;
  DROP TABLE "_pages_v_blocks_about3_companies" CASCADE;
  DROP TABLE "_pages_v_blocks_about3_achievements" CASCADE;
  DROP TABLE "_pages_v_blocks_about3_content_sections" CASCADE;
  DROP TABLE "_pages_v_blocks_about3" CASCADE;
  ALTER TABLE "pages_blocks_content" ALTER COLUMN "layout_style" SET DATA TYPE text;
  ALTER TABLE "pages_blocks_content" ALTER COLUMN "layout_style" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum_pages_blocks_content_layout_style";
  CREATE TYPE "public"."enum_pages_blocks_content_layout_style" AS ENUM('default', 'asymmetric');
  ALTER TABLE "pages_blocks_content" ALTER COLUMN "layout_style" SET DEFAULT 'default'::"public"."enum_pages_blocks_content_layout_style";
  ALTER TABLE "pages_blocks_content" ALTER COLUMN "layout_style" SET DATA TYPE "public"."enum_pages_blocks_content_layout_style" USING "layout_style"::"public"."enum_pages_blocks_content_layout_style";
  ALTER TABLE "_pages_v_blocks_content" ALTER COLUMN "layout_style" SET DATA TYPE text;
  ALTER TABLE "_pages_v_blocks_content" ALTER COLUMN "layout_style" SET DEFAULT 'default'::text;
  DROP TYPE "public"."enum__pages_v_blocks_content_layout_style";
  CREATE TYPE "public"."enum__pages_v_blocks_content_layout_style" AS ENUM('default', 'asymmetric');
  ALTER TABLE "_pages_v_blocks_content" ALTER COLUMN "layout_style" SET DEFAULT 'default'::"public"."enum__pages_v_blocks_content_layout_style";
  ALTER TABLE "_pages_v_blocks_content" ALTER COLUMN "layout_style" SET DATA TYPE "public"."enum__pages_v_blocks_content_layout_style" USING "layout_style"::"public"."enum__pages_v_blocks_content_layout_style";`)
}
