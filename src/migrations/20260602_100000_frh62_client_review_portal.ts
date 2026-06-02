import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── New collection: portfolio_client_sessions ─────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS portfolio_client_sessions (
      id                SERIAL PRIMARY KEY,
      portfolio_id      INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
      session_token     TEXT NOT NULL,
      client_name       TEXT,
      client_email      TEXT,
      ip_address        TEXT,
      user_agent        TEXT,
      is_identified     BOOLEAN NOT NULL DEFAULT false,
      expires_at        TIMESTAMPTZ NOT NULL,
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_client_sessions_token
      ON portfolio_client_sessions (session_token)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_client_sessions_portfolio
      ON portfolio_client_sessions (portfolio_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_client_sessions_expires
      ON portfolio_client_sessions (expires_at)
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS portfolio_client_sessions_saved_selection_ids (
      _order      INTEGER NOT NULL,
      _parent_id  INTEGER NOT NULL REFERENCES portfolio_client_sessions(id) ON DELETE CASCADE,
      id          VARCHAR PRIMARY KEY NOT NULL,
      media_id    INTEGER,
      instance_id TEXT
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_pcs_saved_sel_parent
      ON portfolio_client_sessions_saved_selection_ids (_parent_id)
  `)

  // ── New collection: portfolio_client_reviews ──────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS portfolio_client_reviews (
      id                SERIAL PRIMARY KEY,
      portfolio_id      INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
      client_session_id INTEGER REFERENCES portfolio_client_sessions(id) ON DELETE SET NULL,
      client_name       TEXT NOT NULL DEFAULT '',
      client_email      TEXT,
      status            TEXT NOT NULL DEFAULT 'submitted',
      item_count        INTEGER,
      client_note       TEXT,
      submitted_at      TIMESTAMPTZ NOT NULL,
      acknowledged_at   TIMESTAMPTZ,
      acknowledged_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_client_reviews_portfolio
      ON portfolio_client_reviews (portfolio_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_client_reviews_session
      ON portfolio_client_reviews (client_session_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_client_reviews_status
      ON portfolio_client_reviews (status)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_client_reviews_submitted
      ON portfolio_client_reviews (submitted_at)
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS portfolio_client_reviews_selected_items (
      _order          INTEGER NOT NULL,
      _parent_id      INTEGER NOT NULL REFERENCES portfolio_client_reviews(id) ON DELETE CASCADE,
      id              VARCHAR PRIMARY KEY NOT NULL,
      media_id        INTEGER REFERENCES media(id) ON DELETE SET NULL,
      instance_id     TEXT,
      instance_title  TEXT
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_pcr_selected_items_parent
      ON portfolio_client_reviews_selected_items (_parent_id)
  `)

  // ── New collection: portfolio_asset_comments ──────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS portfolio_asset_comments (
      id                SERIAL PRIMARY KEY,
      portfolio_id      INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
      media_id          INTEGER REFERENCES media(id) ON DELETE SET NULL,
      client_session_id INTEGER REFERENCES portfolio_client_sessions(id) ON DELETE SET NULL,
      client_name       TEXT NOT NULL DEFAULT '',
      client_email      TEXT,
      body              TEXT NOT NULL DEFAULT '',
      status            TEXT NOT NULL DEFAULT 'visible',
      resolved_at       TIMESTAMPTZ,
      resolved_by_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_asset_comments_portfolio
      ON portfolio_asset_comments (portfolio_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_asset_comments_media
      ON portfolio_asset_comments (media_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_asset_comments_session
      ON portfolio_asset_comments (client_session_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_asset_comments_status
      ON portfolio_asset_comments (status)
  `)

  // ── New collection: portfolio_download_logs ───────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS portfolio_download_logs (
      id                SERIAL PRIMARY KEY,
      portfolio_id      INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
      client_session_id INTEGER REFERENCES portfolio_client_sessions(id) ON DELETE SET NULL,
      client_name       TEXT,
      item_count        INTEGER,
      quality           TEXT,
      zip_filename      TEXT,
      downloaded_at     TIMESTAMPTZ NOT NULL,
      ip_address        TEXT,
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_download_logs_portfolio
      ON portfolio_download_logs (portfolio_id)
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolio_download_logs_downloaded
      ON portfolio_download_logs (downloaded_at)
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS portfolio_download_logs_downloaded_items (
      _order      INTEGER NOT NULL,
      _parent_id  INTEGER NOT NULL REFERENCES portfolio_download_logs(id) ON DELETE CASCADE,
      id          VARCHAR PRIMARY KEY NOT NULL,
      media_id    INTEGER REFERENCES media(id) ON DELETE SET NULL
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_pdl_downloaded_items_parent
      ON portfolio_download_logs_downloaded_items (_parent_id)
  `)

  // ── Extend portfolios table: clientReviewSettings group ──────────────────
  await db.execute(sql`
    ALTER TABLE portfolios
      ADD COLUMN IF NOT EXISTS client_review_settings_allow_selection              BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS client_review_settings_allow_comments               BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS client_review_settings_allow_download               BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS client_review_settings_require_client_identification BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS client_review_settings_selection_limit              INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS client_review_settings_download_quality             TEXT NOT NULL DEFAULT 'proxy',
      ADD COLUMN IF NOT EXISTS client_review_settings_review_message               VARCHAR(300)
  `)

  // ── payload_locked_documents_rels: add FK columns for new collections ────
  await db.execute(sql`
    ALTER TABLE payload_locked_documents_rels
      ADD COLUMN IF NOT EXISTS portfolio_client_sessions_id  INTEGER REFERENCES portfolio_client_sessions(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS portfolio_client_reviews_id   INTEGER REFERENCES portfolio_client_reviews(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS portfolio_asset_comments_id   INTEGER REFERENCES portfolio_asset_comments(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS portfolio_download_logs_id    INTEGER REFERENCES portfolio_download_logs(id) ON DELETE CASCADE
  `)

  // Mirror in the versions table
  await db.execute(sql`
    ALTER TABLE "_portfolios_v"
      ADD COLUMN IF NOT EXISTS version_client_review_settings_allow_selection              BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS version_client_review_settings_allow_comments               BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS version_client_review_settings_allow_download               BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS version_client_review_settings_require_client_identification BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS version_client_review_settings_selection_limit              INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS version_client_review_settings_download_quality             TEXT NOT NULL DEFAULT 'proxy',
      ADD COLUMN IF NOT EXISTS version_client_review_settings_review_message               VARCHAR(300)
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Remove portfolios columns
  await db.execute(sql`
    ALTER TABLE portfolios
      DROP COLUMN IF EXISTS client_review_settings_allow_selection,
      DROP COLUMN IF EXISTS client_review_settings_allow_comments,
      DROP COLUMN IF EXISTS client_review_settings_allow_download,
      DROP COLUMN IF EXISTS client_review_settings_require_client_identification,
      DROP COLUMN IF EXISTS client_review_settings_selection_limit,
      DROP COLUMN IF EXISTS client_review_settings_download_quality,
      DROP COLUMN IF EXISTS client_review_settings_review_message
  `)

  await db.execute(sql`
    ALTER TABLE "_portfolios_v"
      DROP COLUMN IF EXISTS version_client_review_settings_allow_selection,
      DROP COLUMN IF EXISTS version_client_review_settings_allow_comments,
      DROP COLUMN IF EXISTS version_client_review_settings_allow_download,
      DROP COLUMN IF EXISTS version_client_review_settings_require_client_identification,
      DROP COLUMN IF EXISTS version_client_review_settings_selection_limit,
      DROP COLUMN IF EXISTS version_client_review_settings_download_quality,
      DROP COLUMN IF EXISTS version_client_review_settings_review_message
  `)

  // Remove locked documents rels columns
  await db.execute(sql`
    ALTER TABLE payload_locked_documents_rels
      DROP COLUMN IF EXISTS portfolio_client_sessions_id,
      DROP COLUMN IF EXISTS portfolio_client_reviews_id,
      DROP COLUMN IF EXISTS portfolio_asset_comments_id,
      DROP COLUMN IF EXISTS portfolio_download_logs_id
  `)

  // Drop new tables
  await db.execute(sql`DROP TABLE IF EXISTS portfolio_download_logs_downloaded_items`)
  await db.execute(sql`DROP TABLE IF EXISTS portfolio_download_logs`)
  await db.execute(sql`DROP TABLE IF EXISTS portfolio_asset_comments`)
  await db.execute(sql`DROP TABLE IF EXISTS portfolio_client_reviews_selected_items`)
  await db.execute(sql`DROP TABLE IF EXISTS portfolio_client_reviews`)
  await db.execute(sql`DROP TABLE IF EXISTS portfolio_client_sessions_saved_selection_ids`)
  await db.execute(sql`DROP TABLE IF EXISTS portfolio_client_sessions`)
}
