import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "admin_activity_logs_id"       INTEGER,
      ADD COLUMN IF NOT EXISTS "admin_diagnostic_sessions_id" INTEGER
  `)

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_admin_activity_logs_fk"
        FOREIGN KEY ("admin_activity_logs_id") REFERENCES "admin_activity_logs"("id") ON DELETE CASCADE,
      ADD CONSTRAINT "payload_locked_documents_rels_admin_diagnostic_sessions_fk"
        FOREIGN KEY ("admin_diagnostic_sessions_id") REFERENCES "admin_diagnostic_sessions"("id") ON DELETE CASCADE
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_admin_activity_logs_id_idx"
      ON "payload_locked_documents_rels" ("admin_activity_logs_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_admin_diagnostic_sessions__idx"
      ON "payload_locked_documents_rels" ("admin_diagnostic_sessions_id")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_admin_activity_logs_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_admin_diagnostic_sessions_fk"
  `)

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "admin_activity_logs_id",
      DROP COLUMN IF EXISTS "admin_diagnostic_sessions_id"
  `)
}
