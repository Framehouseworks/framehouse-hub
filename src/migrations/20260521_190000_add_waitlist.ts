import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// FRH-54: Coming Soon waitlist collection — email signup table plus the
// required payload_locked_documents_rels column that Payload expects for
// every registered collection.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "public"."waitlist" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" varchar NOT NULL,
      "name" varchar,
      "updated_at" timestamp(3) with time zone NOT NULL DEFAULT now(),
      "created_at" timestamp(3) with time zone NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_email_idx"
      ON "public"."waitlist" USING btree ("email");
    CREATE INDEX IF NOT EXISTS "waitlist_updated_at_idx"
      ON "public"."waitlist" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "waitlist_created_at_idx"
      ON "public"."waitlist" USING btree ("created_at");

    ALTER TABLE "public"."payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "waitlist_id" integer;
    ALTER TABLE "public"."payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_waitlist_fk";
    ALTER TABLE "public"."payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_waitlist_fk"
      FOREIGN KEY ("waitlist_id") REFERENCES "public"."waitlist"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_waitlist_id_idx"
      ON "public"."payload_locked_documents_rels" USING btree ("waitlist_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."payload_locked_documents_rels_waitlist_id_idx";
    ALTER TABLE "public"."payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_waitlist_fk";
    ALTER TABLE "public"."payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "waitlist_id";

    DROP INDEX IF EXISTS "public"."waitlist_created_at_idx";
    DROP INDEX IF EXISTS "public"."waitlist_updated_at_idx";
    DROP INDEX IF EXISTS "public"."waitlist_email_idx";
    DROP TABLE IF EXISTS "public"."waitlist";
  `)
}
