import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ── Enums ─────────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TYPE "enum_portfolio_client_reviews_status" AS ENUM (
      'submitted', 'acknowledged', 'approved', 'archived'
    )
  `)

  await db.execute(sql`
    CREATE TYPE "enum_portfolio_asset_comments_status" AS ENUM (
      'visible', 'resolved', 'archived'
    )
  `)

  await db.execute(sql`
    CREATE TYPE "enum_portfolio_download_logs_quality" AS ENUM (
      'proxy', 'original'
    )
  `)

  await db.execute(sql`
    CREATE TYPE "p_crs_dl_quality" AS ENUM (
      'proxy', 'original'
    )
  `)

  // ── New collection: portfolio_client_sessions ─────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portfolio_client_sessions" (
      "id"               SERIAL PRIMARY KEY,
      "portfolio_id"     INTEGER NOT NULL,
      "session_token"    VARCHAR NOT NULL,
      "client_name"      VARCHAR,
      "client_email"     VARCHAR,
      "ip_address"       VARCHAR,
      "user_agent"       VARCHAR,
      "is_identified"    BOOLEAN DEFAULT false,
      "expires_at"       TIMESTAMP(3) WITH TIME ZONE NOT NULL,
      "updated_at"       TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "created_at"       TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "portfolio_client_sessions_portfolio_id_portfolios_id_fk"
        FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE SET NULL
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_sessions_portfolio_idx"
      ON "portfolio_client_sessions" ("portfolio_id")
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_client_sessions_session_token_idx"
      ON "portfolio_client_sessions" ("session_token")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_sessions_expires_at_idx"
      ON "portfolio_client_sessions" ("expires_at")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_sessions_updated_at_idx"
      ON "portfolio_client_sessions" ("updated_at")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_sessions_created_at_idx"
      ON "portfolio_client_sessions" ("created_at")
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portfolio_client_sessions_saved_selection_ids" (
      "_order"      INTEGER NOT NULL,
      "_parent_id"  INTEGER NOT NULL,
      "id"          VARCHAR PRIMARY KEY NOT NULL,
      "media_id"    NUMERIC NOT NULL,
      "instance_id" VARCHAR,
      CONSTRAINT "portfolio_client_sessions_saved_selection_ids_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "portfolio_client_sessions"("id") ON DELETE CASCADE
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_sessions_saved_selection_ids_order_idx"
      ON "portfolio_client_sessions_saved_selection_ids" ("_order")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_sessions_saved_selection_ids_parent_id_idx"
      ON "portfolio_client_sessions_saved_selection_ids" ("_parent_id")
  `)

  // ── New collection: portfolio_client_reviews ──────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portfolio_client_reviews" (
      "id"                  SERIAL PRIMARY KEY,
      "portfolio_id"        INTEGER NOT NULL,
      "client_session_id"   INTEGER,
      "client_name"         VARCHAR NOT NULL,
      "client_email"        VARCHAR,
      "status"              "enum_portfolio_client_reviews_status" DEFAULT 'submitted',
      "item_count"          NUMERIC,
      "client_note"         VARCHAR,
      "submitted_at"        TIMESTAMP(3) WITH TIME ZONE NOT NULL,
      "acknowledged_at"     TIMESTAMP(3) WITH TIME ZONE,
      "acknowledged_by_id"  INTEGER,
      "updated_at"          TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "created_at"          TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "portfolio_client_reviews_portfolio_id_portfolios_id_fk"
        FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE SET NULL,
      CONSTRAINT "portfolio_client_reviews_client_session_id_portfolio_client_sessions_id_fk"
        FOREIGN KEY ("client_session_id") REFERENCES "portfolio_client_sessions"("id") ON DELETE SET NULL,
      CONSTRAINT "portfolio_client_reviews_acknowledged_by_id_users_id_fk"
        FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_reviews_portfolio_idx"
      ON "portfolio_client_reviews" ("portfolio_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_reviews_client_session_idx"
      ON "portfolio_client_reviews" ("client_session_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_reviews_status_idx"
      ON "portfolio_client_reviews" ("status")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_reviews_submitted_at_idx"
      ON "portfolio_client_reviews" ("submitted_at")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_reviews_acknowledged_by_idx"
      ON "portfolio_client_reviews" ("acknowledged_by_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_reviews_updated_at_idx"
      ON "portfolio_client_reviews" ("updated_at")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_reviews_created_at_idx"
      ON "portfolio_client_reviews" ("created_at")
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portfolio_client_reviews_selected_items" (
      "_order"          INTEGER NOT NULL,
      "_parent_id"      INTEGER NOT NULL,
      "id"              VARCHAR PRIMARY KEY NOT NULL,
      "media_id"        INTEGER NOT NULL,
      "instance_id"     VARCHAR,
      "instance_title"  VARCHAR,
      CONSTRAINT "portfolio_client_reviews_selected_items_media_id_media_id_fk"
        FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL,
      CONSTRAINT "portfolio_client_reviews_selected_items_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "portfolio_client_reviews"("id") ON DELETE CASCADE
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_reviews_selected_items_order_idx"
      ON "portfolio_client_reviews_selected_items" ("_order")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_reviews_selected_items_parent_id_idx"
      ON "portfolio_client_reviews_selected_items" ("_parent_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_client_reviews_selected_items_media_idx"
      ON "portfolio_client_reviews_selected_items" ("media_id")
  `)

  // ── New collection: portfolio_asset_comments ──────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portfolio_asset_comments" (
      "id"                SERIAL PRIMARY KEY,
      "portfolio_id"      INTEGER NOT NULL,
      "media_id"          INTEGER NOT NULL,
      "client_session_id" INTEGER,
      "client_name"       VARCHAR NOT NULL,
      "client_email"      VARCHAR,
      "body"              VARCHAR NOT NULL,
      "status"            "enum_portfolio_asset_comments_status" DEFAULT 'visible',
      "resolved_at"       TIMESTAMP(3) WITH TIME ZONE,
      "resolved_by_id"    INTEGER,
      "updated_at"        TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "created_at"        TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "portfolio_asset_comments_portfolio_id_portfolios_id_fk"
        FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE SET NULL,
      CONSTRAINT "portfolio_asset_comments_media_id_media_id_fk"
        FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL,
      CONSTRAINT "portfolio_asset_comments_client_session_id_portfolio_client_sessions_id_fk"
        FOREIGN KEY ("client_session_id") REFERENCES "portfolio_client_sessions"("id") ON DELETE SET NULL,
      CONSTRAINT "portfolio_asset_comments_resolved_by_id_users_id_fk"
        FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_asset_comments_portfolio_idx"
      ON "portfolio_asset_comments" ("portfolio_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_asset_comments_media_idx"
      ON "portfolio_asset_comments" ("media_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_asset_comments_client_session_idx"
      ON "portfolio_asset_comments" ("client_session_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_asset_comments_status_idx"
      ON "portfolio_asset_comments" ("status")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_asset_comments_resolved_by_idx"
      ON "portfolio_asset_comments" ("resolved_by_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_asset_comments_updated_at_idx"
      ON "portfolio_asset_comments" ("updated_at")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_asset_comments_created_at_idx"
      ON "portfolio_asset_comments" ("created_at")
  `)

  // ── New collection: portfolio_download_logs ───────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portfolio_download_logs" (
      "id"                SERIAL PRIMARY KEY,
      "portfolio_id"      INTEGER NOT NULL,
      "client_session_id" INTEGER,
      "client_name"       VARCHAR,
      "item_count"        NUMERIC,
      "quality"           "enum_portfolio_download_logs_quality",
      "zip_filename"      VARCHAR,
      "downloaded_at"     TIMESTAMP(3) WITH TIME ZONE NOT NULL,
      "ip_address"        VARCHAR,
      "updated_at"        TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      "created_at"        TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT "portfolio_download_logs_portfolio_id_portfolios_id_fk"
        FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE SET NULL,
      CONSTRAINT "portfolio_download_logs_client_session_id_portfolio_client_sessions_id_fk"
        FOREIGN KEY ("client_session_id") REFERENCES "portfolio_client_sessions"("id") ON DELETE SET NULL
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_download_logs_portfolio_idx"
      ON "portfolio_download_logs" ("portfolio_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_download_logs_client_session_idx"
      ON "portfolio_download_logs" ("client_session_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_download_logs_downloaded_at_idx"
      ON "portfolio_download_logs" ("downloaded_at")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_download_logs_updated_at_idx"
      ON "portfolio_download_logs" ("updated_at")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_download_logs_created_at_idx"
      ON "portfolio_download_logs" ("created_at")
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "portfolio_download_logs_downloaded_items" (
      "_order"     INTEGER NOT NULL,
      "_parent_id" INTEGER NOT NULL,
      "id"         VARCHAR PRIMARY KEY NOT NULL,
      "media_id"   INTEGER,
      CONSTRAINT "portfolio_download_logs_downloaded_items_media_id_media_id_fk"
        FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE SET NULL,
      CONSTRAINT "portfolio_download_logs_downloaded_items_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "portfolio_download_logs"("id") ON DELETE CASCADE
    )
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_download_logs_downloaded_items_order_idx"
      ON "portfolio_download_logs_downloaded_items" ("_order")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_download_logs_downloaded_items_parent_id_idx"
      ON "portfolio_download_logs_downloaded_items" ("_parent_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "portfolio_download_logs_downloaded_items_media_idx"
      ON "portfolio_download_logs_downloaded_items" ("media_id")
  `)

  // ── Extend portfolios table: clientReviewSettings group ──────────────────
  await db.execute(sql`
    ALTER TABLE "portfolios"
      ADD COLUMN IF NOT EXISTS "client_review_settings_allow_selection"               BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "client_review_settings_allow_comments"                BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "client_review_settings_allow_download"                BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "client_review_settings_require_client_identification" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "client_review_settings_selection_limit"               NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "client_review_settings_download_quality"              "p_crs_dl_quality" DEFAULT 'proxy',
      ADD COLUMN IF NOT EXISTS "client_review_settings_review_message"                VARCHAR
  `)

  // ── payload_locked_documents_rels: add FK columns for new collections ────
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "portfolio_client_sessions_id" INTEGER,
      ADD COLUMN IF NOT EXISTS "portfolio_client_reviews_id"  INTEGER,
      ADD COLUMN IF NOT EXISTS "portfolio_asset_comments_id"  INTEGER,
      ADD COLUMN IF NOT EXISTS "portfolio_download_logs_id"   INTEGER
  `)

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_portfolio_client_sessions_fk"
        FOREIGN KEY ("portfolio_client_sessions_id") REFERENCES "portfolio_client_sessions"("id") ON DELETE CASCADE,
      ADD CONSTRAINT "payload_locked_documents_rels_portfolio_client_reviews_fk"
        FOREIGN KEY ("portfolio_client_reviews_id") REFERENCES "portfolio_client_reviews"("id") ON DELETE CASCADE,
      ADD CONSTRAINT "payload_locked_documents_rels_portfolio_asset_comments_fk"
        FOREIGN KEY ("portfolio_asset_comments_id") REFERENCES "portfolio_asset_comments"("id") ON DELETE CASCADE,
      ADD CONSTRAINT "payload_locked_documents_rels_portfolio_download_logs_fk"
        FOREIGN KEY ("portfolio_download_logs_id") REFERENCES "portfolio_download_logs"("id") ON DELETE CASCADE
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_portfolio_client_sessions__idx"
      ON "payload_locked_documents_rels" ("portfolio_client_sessions_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_portfolio_client_reviews_i_idx"
      ON "payload_locked_documents_rels" ("portfolio_client_reviews_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_portfolio_asset_comments_i_idx"
      ON "payload_locked_documents_rels" ("portfolio_asset_comments_id")
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_portfolio_download_logs_id_idx"
      ON "payload_locked_documents_rels" ("portfolio_download_logs_id")
  `)

  // Mirror clientReviewSettings in the versions table
  await db.execute(sql`
    ALTER TABLE "_portfolios_v"
      ADD COLUMN IF NOT EXISTS "version_client_review_settings_allow_selection"               BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "version_client_review_settings_allow_comments"                BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "version_client_review_settings_allow_download"                BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "version_client_review_settings_require_client_identification" BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS "version_client_review_settings_selection_limit"               NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "version_client_review_settings_download_quality"              "p_crs_dl_quality" DEFAULT 'proxy',
      ADD COLUMN IF NOT EXISTS "version_client_review_settings_review_message"                VARCHAR
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_portfolios_v"
      DROP COLUMN IF EXISTS "version_client_review_settings_allow_selection",
      DROP COLUMN IF EXISTS "version_client_review_settings_allow_comments",
      DROP COLUMN IF EXISTS "version_client_review_settings_allow_download",
      DROP COLUMN IF EXISTS "version_client_review_settings_require_client_identification",
      DROP COLUMN IF EXISTS "version_client_review_settings_selection_limit",
      DROP COLUMN IF EXISTS "version_client_review_settings_download_quality",
      DROP COLUMN IF EXISTS "version_client_review_settings_review_message"
  `)

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_portfolio_client_sessions_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_portfolio_client_reviews_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_portfolio_asset_comments_fk",
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_portfolio_download_logs_fk"
  `)

  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "portfolio_client_sessions_id",
      DROP COLUMN IF EXISTS "portfolio_client_reviews_id",
      DROP COLUMN IF EXISTS "portfolio_asset_comments_id",
      DROP COLUMN IF EXISTS "portfolio_download_logs_id"
  `)

  await db.execute(sql`
    ALTER TABLE "portfolios"
      DROP COLUMN IF EXISTS "client_review_settings_allow_selection",
      DROP COLUMN IF EXISTS "client_review_settings_allow_comments",
      DROP COLUMN IF EXISTS "client_review_settings_allow_download",
      DROP COLUMN IF EXISTS "client_review_settings_require_client_identification",
      DROP COLUMN IF EXISTS "client_review_settings_selection_limit",
      DROP COLUMN IF EXISTS "client_review_settings_download_quality",
      DROP COLUMN IF EXISTS "client_review_settings_review_message"
  `)

  await db.execute(sql`DROP TABLE IF EXISTS "portfolio_download_logs_downloaded_items"`)
  await db.execute(sql`DROP TABLE IF EXISTS "portfolio_download_logs"`)
  await db.execute(sql`DROP TABLE IF EXISTS "portfolio_asset_comments"`)
  await db.execute(sql`DROP TABLE IF EXISTS "portfolio_client_reviews_selected_items"`)
  await db.execute(sql`DROP TABLE IF EXISTS "portfolio_client_reviews"`)
  await db.execute(sql`DROP TABLE IF EXISTS "portfolio_client_sessions_saved_selection_ids"`)
  await db.execute(sql`DROP TABLE IF EXISTS "portfolio_client_sessions"`)

  await db.execute(sql`DROP TYPE IF EXISTS "p_crs_dl_quality"`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_portfolio_download_logs_quality"`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_portfolio_asset_comments_status"`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_portfolio_client_reviews_status"`)
}
