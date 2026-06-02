import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── Enum for action_type ──────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TYPE "enum_admin_activity_logs_action_type" AS ENUM (
      'inspect_account',
      'launch_diagnostic',
      'terminate_diagnostic',
      'diagnostic_expired',
      'portfolio_password_reset',
      'portfolio_visibility_change',
      'field_override',
      'account_role_change'
    )
  `)

  // ── New collection: admin_diagnostic_sessions (created first — referenced by admin_activity_logs) ──
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_diagnostic_sessions" (
      "id"               SERIAL PRIMARY KEY,
      "admin_id"         INTEGER NOT NULL,
      "target_creative_id" INTEGER NOT NULL,
      "token_hash"       VARCHAR NOT NULL,
      "expires_at"       TIMESTAMP(3) WITH TIME ZONE NOT NULL,
      "is_active"        BOOLEAN DEFAULT true,
      "terminated_at"    TIMESTAMP(3) WITH TIME ZONE,
      "terminated_by_id" INTEGER,
      "ip_address"       VARCHAR,
      "user_agent"       VARCHAR,
      "updated_at"       TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "created_at"       TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "admin_diagnostic_sessions_admin_id_users_id_fk"
        FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "admin_diagnostic_sessions_target_creative_id_users_id_fk"
        FOREIGN KEY ("target_creative_id") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "admin_diagnostic_sessions_terminated_by_id_users_id_fk"
        FOREIGN KEY ("terminated_by_id") REFERENCES "users"("id") ON DELETE SET NULL
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_diagnostic_sessions_admin_idx"
      ON "admin_diagnostic_sessions" ("admin_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_diagnostic_sessions_target_creative_idx"
      ON "admin_diagnostic_sessions" ("target_creative_id")
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "admin_diagnostic_sessions_token_hash_idx"
      ON "admin_diagnostic_sessions" ("token_hash")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_diagnostic_sessions_expires_at_idx"
      ON "admin_diagnostic_sessions" ("expires_at")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_diagnostic_sessions_is_active_idx"
      ON "admin_diagnostic_sessions" ("is_active")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_diagnostic_sessions_terminated_by_idx"
      ON "admin_diagnostic_sessions" ("terminated_by_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_diagnostic_sessions_updated_at_idx"
      ON "admin_diagnostic_sessions" ("updated_at")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_diagnostic_sessions_created_at_idx"
      ON "admin_diagnostic_sessions" ("created_at")
  `)

  // ── New collection: admin_activity_logs ───────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "admin_activity_logs" (
      "id"                    SERIAL PRIMARY KEY,
      "admin_user_id"         INTEGER NOT NULL,
      "target_user_id"        INTEGER,
      "target_portfolio_id"   INTEGER,
      "action_type"           "enum_admin_activity_logs_action_type" NOT NULL,
      "action_description"    VARCHAR NOT NULL,
      "metadata"              JSONB,
      "diagnostic_session_id" INTEGER,
      "ip_address"            VARCHAR,
      "user_agent"            VARCHAR,
      "updated_at"            TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "created_at"            TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "admin_activity_logs_admin_user_id_users_id_fk"
        FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "admin_activity_logs_target_user_id_users_id_fk"
        FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "admin_activity_logs_target_portfolio_id_portfolios_id_fk"
        FOREIGN KEY ("target_portfolio_id") REFERENCES "portfolios"("id") ON DELETE SET NULL,
      CONSTRAINT "admin_activity_logs_diagnostic_session_id_admin_diagnostic_sessions_id_fk"
        FOREIGN KEY ("diagnostic_session_id") REFERENCES "admin_diagnostic_sessions"("id") ON DELETE SET NULL
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_activity_logs_admin_user_idx"
      ON "admin_activity_logs" ("admin_user_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_activity_logs_target_user_idx"
      ON "admin_activity_logs" ("target_user_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_activity_logs_target_portfolio_idx"
      ON "admin_activity_logs" ("target_portfolio_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_activity_logs_action_type_idx"
      ON "admin_activity_logs" ("action_type")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_activity_logs_diagnostic_session_idx"
      ON "admin_activity_logs" ("diagnostic_session_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_activity_logs_updated_at_idx"
      ON "admin_activity_logs" ("updated_at")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "admin_activity_logs_created_at_idx"
      ON "admin_activity_logs" ("created_at")
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "admin_activity_logs" CASCADE`)
  await db.execute(sql`DROP TABLE IF EXISTS "admin_diagnostic_sessions" CASCADE`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_admin_activity_logs_action_type"`)
}
