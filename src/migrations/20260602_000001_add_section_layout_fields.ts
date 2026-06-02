import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add section layout fields to the live portfolios_blocks_grid table
  await db.execute(sql`
    ALTER TABLE portfolios_blocks_grid
      ADD COLUMN IF NOT EXISTS section_name            TEXT,
      ADD COLUMN IF NOT EXISTS section_anchor          TEXT,
      ADD COLUMN IF NOT EXISTS section_anchor_override TEXT,
      ADD COLUMN IF NOT EXISTS show_section_header     BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS layout_style            TEXT NOT NULL DEFAULT 'masonry',
      ADD COLUMN IF NOT EXISTS filmstrip_track_height  TEXT NOT NULL DEFAULT 'comfortable',
      ADD COLUMN IF NOT EXISTS uniform_grid_columns    TEXT NOT NULL DEFAULT '3'
  `)

  // Mirror columns in the versions table
  await db.execute(sql`
    ALTER TABLE "_portfolios_v_blocks_grid"
      ADD COLUMN IF NOT EXISTS section_name            TEXT,
      ADD COLUMN IF NOT EXISTS section_anchor          TEXT,
      ADD COLUMN IF NOT EXISTS section_anchor_override TEXT,
      ADD COLUMN IF NOT EXISTS show_section_header     BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS layout_style            TEXT NOT NULL DEFAULT 'masonry',
      ADD COLUMN IF NOT EXISTS filmstrip_track_height  TEXT NOT NULL DEFAULT 'comfortable',
      ADD COLUMN IF NOT EXISTS uniform_grid_columns    TEXT NOT NULL DEFAULT '3'
  `)

  // Index for anchor-based deep-link lookups
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolios_blocks_grid_anchor
      ON portfolios_blocks_grid (section_anchor)
      WHERE section_anchor IS NOT NULL
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS idx_portfolios_blocks_grid_anchor`)

  await db.execute(sql`
    ALTER TABLE portfolios_blocks_grid
      DROP COLUMN IF EXISTS section_name,
      DROP COLUMN IF EXISTS section_anchor,
      DROP COLUMN IF EXISTS section_anchor_override,
      DROP COLUMN IF EXISTS show_section_header,
      DROP COLUMN IF EXISTS layout_style,
      DROP COLUMN IF EXISTS filmstrip_track_height,
      DROP COLUMN IF EXISTS uniform_grid_columns
  `)

  await db.execute(sql`
    ALTER TABLE "_portfolios_v_blocks_grid"
      DROP COLUMN IF EXISTS section_name,
      DROP COLUMN IF EXISTS section_anchor,
      DROP COLUMN IF EXISTS section_anchor_override,
      DROP COLUMN IF EXISTS show_section_header,
      DROP COLUMN IF EXISTS layout_style,
      DROP COLUMN IF EXISTS filmstrip_track_height,
      DROP COLUMN IF EXISTS uniform_grid_columns
  `)
}
