import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. Create Ingestion Status Enum
    DO $$ BEGIN
      CREATE TYPE "public"."enum_media_ingestion_status" AS ENUM('active', 'processing', 'stale', 'ready', 'failed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    -- 2. Update Media Table
    ALTER TABLE "public"."media" 
      ADD COLUMN IF NOT EXISTS "ingestion_status" "public"."enum_media_ingestion_status" DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS "capture_date" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "technical_camera_model" varchar,
      ADD COLUMN IF NOT EXISTS "technical_lens_model" varchar,
      ADD COLUMN IF NOT EXISTS "technical_iso" numeric,
      ADD COLUMN IF NOT EXISTS "technical_aperture" numeric,
      ADD COLUMN IF NOT EXISTS "technical_shutter_speed" varchar,
      ADD COLUMN IF NOT EXISTS "technical_focal_length" numeric,
      ADD COLUMN IF NOT EXISTS "location_latitude" numeric,
      ADD COLUMN IF NOT EXISTS "location_longitude" numeric,
      ADD COLUMN IF NOT EXISTS "location_address" varchar;

    -- 3. Create Manual Tags Table
    CREATE TABLE IF NOT EXISTS "public"."media_manual_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar
    );

    -- 4. Create Heuristic Tags Table
    CREATE TABLE IF NOT EXISTS "public"."media_heuristic_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar
    );

    -- 5. Add Constraints & Indices
    DO $$ BEGIN
      ALTER TABLE "public"."media_manual_tags" ADD CONSTRAINT "media_manual_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "public"."media_heuristic_tags" ADD CONSTRAINT "media_heuristic_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "media_capture_date_idx" ON "public"."media" USING btree ("capture_date");
    CREATE INDEX IF NOT EXISTS "media_manual_tags_order_idx" ON "public"."media_manual_tags" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "media_manual_tags_parent_id_idx" ON "public"."media_manual_tags" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "media_heuristic_tags_order_idx" ON "public"."media_heuristic_tags" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "media_heuristic_tags_parent_id_idx" ON "public"."media_heuristic_tags" USING btree ("_parent_id");

    -- 6. Update Media Type Enum
    DO $$ BEGIN
      ALTER TYPE "public"."enum_media_media_type" ADD VALUE 'raw';
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "public"."media_manual_tags" CASCADE;
    DROP TABLE IF EXISTS "public"."media_heuristic_tags" CASCADE;
    ALTER TABLE "public"."media" 
      DROP COLUMN IF EXISTS "ingestion_status",
      DROP COLUMN IF EXISTS "capture_date",
      DROP COLUMN IF EXISTS "technical_camera_model",
      DROP COLUMN IF EXISTS "technical_lens_model",
      DROP COLUMN IF EXISTS "technical_iso",
      DROP COLUMN IF EXISTS "technical_aperture",
      DROP COLUMN IF EXISTS "technical_shutter_speed",
      DROP COLUMN IF EXISTS "technical_focal_length",
      DROP COLUMN IF EXISTS "location_latitude",
      DROP COLUMN IF EXISTS "location_longitude",
      DROP COLUMN IF EXISTS "location_address";
    DROP TYPE IF EXISTS "public"."enum_media_ingestion_status";
  `)
}
