import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// FRH-54: Coming Soon page email signup collection.
// Simple waitlist table with email (unique) and optional name.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "waitlist" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "email" varchar UNIQUE NOT NULL,
      "name" varchar,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "waitlist_email_idx" ON "waitlist" ("email");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "waitlist";
  `)
}
