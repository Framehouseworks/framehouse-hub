import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Create Global Archival Sequence
    CREATE SEQUENCE IF NOT EXISTS global_archival_sequence START WITH 1 INCREMENT BY 1;

    -- 1. Create Enums
    DO $$ BEGIN
      CREATE TYPE "public"."enum_media_ingestion_status" AS ENUM('active', 'processing', 'stale', 'ready', 'failed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_smart_collections_icon" AS ENUM('folder', 'tag', 'sparkles', 'camera', 'map');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- 2. Enhance Media Table with Intelligence Fields
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "ingestion_status" "public"."enum_media_ingestion_status" DEFAULT 'active';
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "capture_date" timestamp with time zone;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "technical_camera_model" varchar;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "technical_lens_model" varchar;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "technical_iso" numeric;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "technical_aperture" numeric;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "technical_shutter_speed" varchar;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "technical_focal_length" numeric;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "location_latitude" numeric;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "location_longitude" numeric;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "location_address" varchar;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "aspect_ratio" varchar;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "error_message" varchar;
    ALTER TABLE "public"."media" ADD COLUMN IF NOT EXISTS "processed_at" timestamp with time zone;

    CREATE INDEX IF NOT EXISTS "media_capture_date_idx" ON "public"."media" ("capture_date");

    -- 3. Create Heuristic Tags Table (Array Relationship)
    CREATE TABLE IF NOT EXISTS "public"."media_heuristic_tags" (
      "id" serial PRIMARY KEY,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "tag" varchar,
      CONSTRAINT "media_heuristic_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "media_heuristic_tags_order_idx" ON "public"."media_heuristic_tags" ("_order");
    CREATE INDEX IF NOT EXISTS "media_heuristic_tags_parent_id_idx" ON "public"."media_heuristic_tags" ("_parent_id");

    -- 4. Create Smart Collections Table
    CREATE TABLE IF NOT EXISTS "public"."smart_collections" (
      "id" serial PRIMARY KEY,
      "name" varchar NOT NULL,
      "owner_id" integer NOT NULL,
      "filter_query" jsonb NOT NULL,
      "icon" "public"."enum_smart_collections_icon" DEFAULT 'folder',
      "description" varchar,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "smart_collections_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS "smart_collections_owner_idx" ON "public"."smart_collections" ("owner_id");
    CREATE INDEX IF NOT EXISTS "smart_collections_updated_at_idx" ON "public"."smart_collections" ("updated_at");
    CREATE INDEX IF NOT EXISTS "smart_collections_created_at_idx" ON "public"."smart_collections" ("created_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP SEQUENCE IF EXISTS global_archival_sequence;
    DROP TABLE IF EXISTS "public"."smart_collections";
    DROP TABLE IF EXISTS "public"."media_heuristic_tags";
    
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "ingestion_status";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "capture_date";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "technical_camera_model";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "technical_lens_model";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "technical_iso";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "technical_aperture";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "technical_shutter_speed";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "technical_focal_length";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "location_latitude";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "location_longitude";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "location_address";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "aspect_ratio";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "error_message";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "processed_at";

    DROP TYPE IF EXISTS "public"."enum_smart_collections_icon";
    DROP TYPE IF EXISTS "public"."enum_media_ingestion_status";
  `)
}
