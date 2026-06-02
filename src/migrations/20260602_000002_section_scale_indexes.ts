import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Enterprise indexes and constraints for the section layout feature.
 *
 * Note: CONCURRENTLY is intentionally omitted — Payload wraps migrations in a
 * transaction block, and CREATE INDEX CONCURRENTLY cannot run inside one.
 * Without CONCURRENTLY the table is briefly locked during index creation;
 * this is acceptable at migration time when the service is not under live load.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Issue 2: Unique partial index — prevents duplicate anchors within a portfolio
  // even via direct DB edits or concurrent-save races.
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolios_blocks_grid_unique_anchor
    ON portfolios_blocks_grid (_parent_id, section_anchor)
    WHERE section_anchor IS NOT NULL AND section_anchor <> ''
  `)

  // Issue 10: Composite index for layout_style filtering within a portfolio.
  // Supports analytics queries: "which portfolios use filmstrip?" across 10k+ portfolios.
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolios_blocks_grid_parent_layout
    ON portfolios_blocks_grid (_parent_id, layout_style)
    WHERE layout_style IS NOT NULL
  `)

  // Mirror on versioned table
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolios_v_blocks_grid_parent_layout
    ON "_portfolios_v_blocks_grid" ("_parent_id", layout_style)
    WHERE layout_style IS NOT NULL
  `)

  // Partial index on section_name for admin support queries across all portfolios
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_portfolios_blocks_grid_section_name
    ON portfolios_blocks_grid (_parent_id, section_name)
    WHERE section_name IS NOT NULL AND section_name <> ''
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS idx_portfolios_blocks_grid_unique_anchor`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_portfolios_blocks_grid_parent_layout`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_portfolios_v_blocks_grid_parent_layout`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_portfolios_blocks_grid_section_name`)
}
