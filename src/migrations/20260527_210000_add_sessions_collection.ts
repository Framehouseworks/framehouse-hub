import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "public"."sessions" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "shoot_date" timestamp(3) with time zone,
      "description" varchar,
      "location_address" varchar,
      "location_latitude" numeric,
      "location_longitude" numeric,
      "cover_asset_id" integer,
      "owner_id" integer NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "public"."sessions_default_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "tag" varchar,
      "id" serial PRIMARY KEY NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "sessions_name_idx"
      ON "public"."sessions" USING btree ("name");

    CREATE INDEX IF NOT EXISTS "sessions_shoot_date_idx"
      ON "public"."sessions" USING btree ("shoot_date");

    CREATE INDEX IF NOT EXISTS "sessions_created_at_idx"
      ON "public"."sessions" USING btree ("created_at");

    CREATE INDEX IF NOT EXISTS "sessions_updated_at_idx"
      ON "public"."sessions" USING btree ("updated_at");

    ALTER TABLE "public"."sessions"
      ADD CONSTRAINT "sessions_cover_asset_id_media_id_fk"
      FOREIGN KEY ("cover_asset_id")
      REFERENCES "public"."media"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    ALTER TABLE "public"."sessions"
      ADD CONSTRAINT "sessions_owner_id_users_id_fk"
      FOREIGN KEY ("owner_id")
      REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    ALTER TABLE "public"."sessions_default_tags"
      ADD CONSTRAINT "sessions_default_tags_parent_id_fk"
      FOREIGN KEY ("_parent_id")
      REFERENCES "public"."sessions"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

    ALTER TABLE "public"."media"
      ADD COLUMN IF NOT EXISTS "session_id" integer;

    ALTER TABLE "public"."media"
      ADD CONSTRAINT "media_session_id_sessions_id_fk"
      FOREIGN KEY ("session_id")
      REFERENCES "public"."sessions"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    CREATE INDEX IF NOT EXISTS "media_session_id_idx"
      ON "public"."media" USING btree ("session_id");

    -- Payload locked-documents relations table needs a sessions_id column
    ALTER TABLE "public"."payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "sessions_id" integer;

    ALTER TABLE "public"."payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_sessions_id_sessions_id_fk"
      FOREIGN KEY ("sessions_id")
      REFERENCES "public"."sessions"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_sessions_id_idx"
      ON "public"."payload_locked_documents_rels" USING btree ("sessions_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."media" DROP CONSTRAINT IF EXISTS "media_session_id_sessions_id_fk";
    DROP INDEX IF EXISTS "public"."media_session_id_idx";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "session_id";

    DROP INDEX IF EXISTS "public"."payload_locked_documents_rels_sessions_id_idx";
    ALTER TABLE "public"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_sessions_id_sessions_id_fk";
    ALTER TABLE "public"."payload_locked_documents_rels" DROP COLUMN IF EXISTS "sessions_id";

    ALTER TABLE "public"."sessions_default_tags" DROP CONSTRAINT IF EXISTS "sessions_default_tags_parent_id_fk";
    ALTER TABLE "public"."sessions" DROP CONSTRAINT IF EXISTS "sessions_cover_asset_id_media_id_fk";
    ALTER TABLE "public"."sessions" DROP CONSTRAINT IF EXISTS "sessions_owner_id_users_id_fk";

    DROP TABLE IF EXISTS "public"."sessions_default_tags";
    DROP TABLE IF EXISTS "public"."sessions";
  `)
}
