import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE payload_locked_documents_rels
      ADD COLUMN IF NOT EXISTS admin_activity_logs_id      INTEGER REFERENCES admin_activity_logs(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS admin_diagnostic_sessions_id INTEGER REFERENCES admin_diagnostic_sessions(id) ON DELETE CASCADE
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE payload_locked_documents_rels
      DROP COLUMN IF EXISTS admin_activity_logs_id,
      DROP COLUMN IF EXISTS admin_diagnostic_sessions_id
  `)
}
