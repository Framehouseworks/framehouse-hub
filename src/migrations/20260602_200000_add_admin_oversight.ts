import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── New collection: admin_activity_logs ───────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id                   SERIAL PRIMARY KEY,
      admin_user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      target_user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      target_portfolio_id  INTEGER REFERENCES portfolios(id) ON DELETE SET NULL,
      action_type          TEXT NOT NULL,
      action_description   TEXT NOT NULL DEFAULT '',
      metadata             JSONB,
      diagnostic_session_id INTEGER,
      ip_address           TEXT,
      user_agent           TEXT,
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_user
      ON admin_activity_logs (admin_user_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_target_user
      ON admin_activity_logs (target_user_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_target_portfolio
      ON admin_activity_logs (target_portfolio_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_action_type
      ON admin_activity_logs (action_type)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at
      ON admin_activity_logs (created_at DESC)
  `)

  // ── New collection: admin_diagnostic_sessions ─────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_diagnostic_sessions (
      id               SERIAL PRIMARY KEY,
      admin_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
      target_creative_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      token_hash       TEXT NOT NULL,
      expires_at       TIMESTAMPTZ NOT NULL,
      is_active        BOOLEAN NOT NULL DEFAULT true,
      terminated_at    TIMESTAMPTZ,
      terminated_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ip_address       TEXT,
      user_agent       TEXT,
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_diagnostic_sessions_token_hash
      ON admin_diagnostic_sessions (token_hash)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admin_diagnostic_sessions_admin
      ON admin_diagnostic_sessions (admin_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admin_diagnostic_sessions_target
      ON admin_diagnostic_sessions (target_creative_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admin_diagnostic_sessions_active
      ON admin_diagnostic_sessions (is_active)
    WHERE is_active = true
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admin_diagnostic_sessions_expires
      ON admin_diagnostic_sessions (expires_at)
  `)

  // ── Add FK from admin_activity_logs to admin_diagnostic_sessions ──────────
  await db.execute(sql`
    ALTER TABLE admin_activity_logs
      ADD CONSTRAINT fk_admin_activity_logs_diagnostic_session
      FOREIGN KEY (diagnostic_session_id)
      REFERENCES admin_diagnostic_sessions(id)
      ON DELETE SET NULL
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_diagnostic_session
      ON admin_activity_logs (diagnostic_session_id)
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS admin_activity_logs CASCADE`)
  await db.execute(sql`DROP TABLE IF EXISTS admin_diagnostic_sessions CASCADE`)
}
