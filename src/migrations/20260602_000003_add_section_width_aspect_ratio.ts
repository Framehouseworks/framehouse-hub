import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE portfolios_blocks_grid
      ADD COLUMN IF NOT EXISTS preserve_aspect_ratio BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS section_width         TEXT    NOT NULL DEFAULT 'full'
  `)

  await db.execute(sql`
    ALTER TABLE "_portfolios_v_blocks_grid"
      ADD COLUMN IF NOT EXISTS preserve_aspect_ratio BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS section_width         TEXT    NOT NULL DEFAULT 'full'
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE portfolios_blocks_grid
      DROP COLUMN IF EXISTS preserve_aspect_ratio,
      DROP COLUMN IF EXISTS section_width
  `)

  await db.execute(sql`
    ALTER TABLE "_portfolios_v_blocks_grid"
      DROP COLUMN IF EXISTS preserve_aspect_ratio,
      DROP COLUMN IF EXISTS section_width
  `)
}
