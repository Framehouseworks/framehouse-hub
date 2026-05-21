import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// FRH-52 phase D: introduce the UploadBatches collection plus a
// nullable media.upload_batch_id_id FK (ON DELETE SET NULL) so deleting
// a batch row doesn't take the assets with it.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_upload_batches_source" AS ENUM ('dashboard', 'admin', 'seed', 'api');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE TABLE IF NOT EXISTS "public"."upload_batches" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "source" "public"."enum_upload_batches_source" NOT NULL DEFAULT 'dashboard',
      "notes" varchar,
      "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
      "created_at" timestamp(3) with time zone NOT NULL DEFAULT now()
    );

    ALTER TABLE "public"."upload_batches"
      DROP CONSTRAINT IF EXISTS "upload_batches_owner_id_users_id_fk";
    ALTER TABLE "public"."upload_batches"
      ADD CONSTRAINT "upload_batches_owner_id_users_id_fk"
      FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    CREATE INDEX IF NOT EXISTS "upload_batches_owner_idx"
      ON "public"."upload_batches" USING btree ("owner_id");
    CREATE INDEX IF NOT EXISTS "upload_batches_updated_at_idx"
      ON "public"."upload_batches" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "upload_batches_created_at_idx"
      ON "public"."upload_batches" USING btree ("created_at");

    ALTER TABLE "public"."media"
      ADD COLUMN IF NOT EXISTS "upload_batch_id_id" integer;
    ALTER TABLE "public"."media"
      DROP CONSTRAINT IF EXISTS "media_upload_batch_id_id_upload_batches_id_fk";
    ALTER TABLE "public"."media"
      ADD CONSTRAINT "media_upload_batch_id_id_upload_batches_id_fk"
      FOREIGN KEY ("upload_batch_id_id") REFERENCES "public"."upload_batches"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
    CREATE INDEX IF NOT EXISTS "media_upload_batch_id_idx"
      ON "public"."media" USING btree ("upload_batch_id_id");

    -- Payload's polymorphic locked-documents join table needs a column +
    -- FK + index per new collection (mirrors the smart_collections
    -- pattern added in 20260518_143700_add_smart_collections_lock_relation).
    ALTER TABLE "public"."payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "upload_batches_id" integer;
    ALTER TABLE "public"."payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_upload_batches_fk";
    ALTER TABLE "public"."payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_upload_batches_fk"
      FOREIGN KEY ("upload_batches_id") REFERENCES "public"."upload_batches"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_upload_batches_id_idx"
      ON "public"."payload_locked_documents_rels" USING btree ("upload_batches_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."payload_locked_documents_rels_upload_batches_id_idx";
    ALTER TABLE "public"."payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_upload_batches_fk";
    ALTER TABLE "public"."payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "upload_batches_id";

    DROP INDEX IF EXISTS "public"."media_upload_batch_id_idx";
    ALTER TABLE "public"."media"
      DROP CONSTRAINT IF EXISTS "media_upload_batch_id_id_upload_batches_id_fk";
    ALTER TABLE "public"."media" DROP COLUMN IF EXISTS "upload_batch_id_id";

    DROP INDEX IF EXISTS "public"."upload_batches_created_at_idx";
    DROP INDEX IF EXISTS "public"."upload_batches_updated_at_idx";
    DROP INDEX IF EXISTS "public"."upload_batches_owner_idx";
    DROP TABLE IF EXISTS "public"."upload_batches";
    DROP TYPE IF EXISTS "public"."enum_upload_batches_source";
  `)
}
