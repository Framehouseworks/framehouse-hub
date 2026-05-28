import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// FRH-47: Smart Collections v2 — new fields for system-generated collections,
// hide/show, manual include/exclude overrides, sort order, cover asset,
// and generated-from provenance.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. New enum for generatedFrom
    DO $$ BEGIN
      CREATE TYPE "public"."enum_smart_collections_generated_from"
        AS ENUM ('manual', 'ai_tags', 'metadata', 'tags', 'location', 'media_type');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- 2. New columns on smart_collections
    ALTER TABLE "public"."smart_collections"
      ADD COLUMN IF NOT EXISTS "is_system_generated" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "is_hidden" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "sort_order" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "cover_asset_id" integer,
      ADD COLUMN IF NOT EXISTS "generated_from"
        "public"."enum_smart_collections_generated_from" NOT NULL DEFAULT 'manual';

    -- 3. FK: cover_asset → media (SET NULL on delete)
    ALTER TABLE "public"."smart_collections"
      DROP CONSTRAINT IF EXISTS "smart_collections_cover_asset_id_media_id_fk";
    ALTER TABLE "public"."smart_collections"
      ADD CONSTRAINT "smart_collections_cover_asset_id_media_id_fk"
      FOREIGN KEY ("cover_asset_id") REFERENCES "public"."media"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    -- 4. Indexes on new columns
    CREATE INDEX IF NOT EXISTS "smart_collections_sort_order_idx"
      ON "public"."smart_collections" USING btree ("sort_order");
    CREATE INDEX IF NOT EXISTS "smart_collections_generated_from_idx"
      ON "public"."smart_collections" USING btree ("generated_from");
    CREATE INDEX IF NOT EXISTS "smart_collections_cover_asset_idx"
      ON "public"."smart_collections" USING btree ("cover_asset_id");
    CREATE INDEX IF NOT EXISTS "smart_collections_is_hidden_idx"
      ON "public"."smart_collections" USING btree ("is_hidden");

    -- 5. Rels table for manualIncludes + manualExcludes (polymorphic Payload pattern)
    CREATE TABLE IF NOT EXISTS "public"."smart_collections_rels" (
      "id"        serial PRIMARY KEY NOT NULL,
      "order"     integer,
      "parent_id" integer NOT NULL,
      "path"      varchar NOT NULL,
      "media_id"  integer
    );

    ALTER TABLE "public"."smart_collections_rels"
      DROP CONSTRAINT IF EXISTS "smart_collections_rels_parent_fk";
    ALTER TABLE "public"."smart_collections_rels"
      ADD CONSTRAINT "smart_collections_rels_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."smart_collections"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

    ALTER TABLE "public"."smart_collections_rels"
      DROP CONSTRAINT IF EXISTS "smart_collections_rels_media_fk";
    ALTER TABLE "public"."smart_collections_rels"
      ADD CONSTRAINT "smart_collections_rels_media_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

    CREATE INDEX IF NOT EXISTS "smart_collections_rels_order_idx"
      ON "public"."smart_collections_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "smart_collections_rels_parent_idx"
      ON "public"."smart_collections_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "smart_collections_rels_path_idx"
      ON "public"."smart_collections_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "smart_collections_rels_media_id_idx"
      ON "public"."smart_collections_rels" USING btree ("media_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."smart_collections_rels_media_id_idx";
    DROP INDEX IF EXISTS "public"."smart_collections_rels_path_idx";
    DROP INDEX IF EXISTS "public"."smart_collections_rels_parent_idx";
    DROP INDEX IF EXISTS "public"."smart_collections_rels_order_idx";
    ALTER TABLE "public"."smart_collections_rels"
      DROP CONSTRAINT IF EXISTS "smart_collections_rels_media_fk";
    ALTER TABLE "public"."smart_collections_rels"
      DROP CONSTRAINT IF EXISTS "smart_collections_rels_parent_fk";
    DROP TABLE IF EXISTS "public"."smart_collections_rels";

    DROP INDEX IF EXISTS "public"."smart_collections_is_hidden_idx";
    DROP INDEX IF EXISTS "public"."smart_collections_cover_asset_idx";
    DROP INDEX IF EXISTS "public"."smart_collections_generated_from_idx";
    DROP INDEX IF EXISTS "public"."smart_collections_sort_order_idx";
    ALTER TABLE "public"."smart_collections"
      DROP CONSTRAINT IF EXISTS "smart_collections_cover_asset_id_media_id_fk";
    ALTER TABLE "public"."smart_collections"
      DROP COLUMN IF EXISTS "generated_from",
      DROP COLUMN IF EXISTS "cover_asset_id",
      DROP COLUMN IF EXISTS "sort_order",
      DROP COLUMN IF EXISTS "is_hidden",
      DROP COLUMN IF EXISTS "is_system_generated";

    DROP TYPE IF EXISTS "public"."enum_smart_collections_generated_from";
  `)
}
