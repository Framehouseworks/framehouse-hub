import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ 
   BEGIN
       -- 1. Create Types safely
       IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_portfolios_blocks_grid_items_size') THEN
           CREATE TYPE "public"."enum_portfolios_blocks_grid_items_size" AS ENUM('small', 'medium', 'large', 'full');
       END IF;
       
       IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_portfolios_blocks_text_alignment') THEN
           CREATE TYPE "public"."enum_portfolios_blocks_text_alignment" AS ENUM('left', 'center', 'right');
       END IF;
   END $$;

   -- 2. Create Tables safely
   CREATE TABLE IF NOT EXISTS "portfolios_blocks_grid_items" (
   	"_order" integer NOT NULL,
   	"_parent_id" varchar NOT NULL,
   	"id" varchar PRIMARY KEY NOT NULL,
   	"media_id" integer NOT NULL,
   	"size" "enum_portfolios_blocks_grid_items_size" DEFAULT 'medium'
   );
   
   CREATE TABLE IF NOT EXISTS "portfolios_blocks_text" (
   	"_order" integer NOT NULL,
   	"_parent_id" integer NOT NULL,
   	"_path" text NOT NULL,
   	"id" varchar PRIMARY KEY NOT NULL,
   	"content" jsonb NOT NULL,
   	"alignment" "enum_portfolios_blocks_text_alignment" DEFAULT 'left',
   	"block_name" varchar
   );
   
   -- 3. Cleanup Legacy Tables
   ALTER TABLE IF EXISTS "portfolios_rels" DISABLE ROW LEVEL SECURITY;
   DROP TABLE IF EXISTS "portfolios_rels" CASCADE;
   
   -- 4. Alter Columns safely
   ALTER TABLE "portfolios_blocks_featured" ALTER COLUMN "caption" SET DATA TYPE jsonb USING caption::jsonb;
   ALTER TABLE "portfolios" ALTER COLUMN "title" SET DATA TYPE jsonb USING title::jsonb;
   ALTER TABLE "portfolios" ALTER COLUMN "slug" DROP NOT NULL;
   ALTER TABLE "portfolios" ALTER COLUMN "subheading" SET DATA TYPE jsonb USING subheading::jsonb;
   
   -- 5. Add Constraints safely (with orphan cleanup)
   DO $$ 
   BEGIN
       -- Cleanup orphans before adding FKs to prevent violations
       DELETE FROM "portfolios_blocks_grid_items" WHERE "media_id" NOT IN (SELECT "id" FROM "public"."media");
       
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolios_blocks_grid_items_media_id_media_id_fk') THEN
           ALTER TABLE "portfolios_blocks_grid_items" ADD CONSTRAINT "portfolios_blocks_grid_items_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
       END IF;

       -- Attempt to clean orphans for parent_id_fk (checking type match first)
       -- Note: _parent_id is varchar, portfolios_blocks_grid.id is varchar. Good.
       DELETE FROM "portfolios_blocks_grid_items" WHERE "_parent_id" NOT IN (SELECT "id" FROM "public"."portfolios_blocks_grid");

       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolios_blocks_grid_items_parent_id_fk') THEN
           ALTER TABLE "portfolios_blocks_grid_items" ADD CONSTRAINT "portfolios_blocks_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portfolios_blocks_grid"("id") ON DELETE cascade ON UPDATE no action;
       END IF;

       DELETE FROM "portfolios_blocks_text" WHERE "_parent_id" NOT IN (SELECT "id" FROM "public"."portfolios");

       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'portfolios_blocks_text_parent_id_fk') THEN
           ALTER TABLE "portfolios_blocks_text" ADD CONSTRAINT "portfolios_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;
       END IF;
   END $$;

   -- 6. Create Indexes safely
   CREATE INDEX IF NOT EXISTS "portfolios_blocks_grid_items_order_idx" ON "portfolios_blocks_grid_items" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "portfolios_blocks_grid_items_parent_id_idx" ON "portfolios_blocks_grid_items" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "portfolios_blocks_grid_items_media_idx" ON "portfolios_blocks_grid_items" USING btree ("media_id");
   CREATE INDEX IF NOT EXISTS "portfolios_blocks_text_order_idx" ON "portfolios_blocks_text" USING btree ("_order");
   CREATE INDEX IF NOT EXISTS "portfolios_blocks_text_parent_id_idx" ON "portfolios_blocks_text" USING btree ("_parent_id");
   CREATE INDEX IF NOT EXISTS "portfolios_blocks_text_path_idx" ON "portfolios_blocks_text" USING btree ("_path");
   
   -- 7. Drop Legacy Columns
   ALTER TABLE "portfolios_blocks_grid" DROP COLUMN IF EXISTS "size_mode";
   ALTER TABLE "portfolios_blocks_featured" DROP COLUMN IF EXISTS "parallax_effect";
   ALTER TABLE "portfolios" DROP COLUMN IF EXISTS "description";
   
   DROP TYPE IF EXISTS "public"."enum_portfolios_blocks_grid_size_mode";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Down migration skipped
}
