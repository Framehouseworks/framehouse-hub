import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
    await db.execute(sql`
    ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN "alt" varchar;
    ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN "caption" varchar;
    ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN "link" varchar;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
    await db.execute(sql`
    ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN IF EXISTS "alt";
    ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN IF EXISTS "caption";
    ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN IF EXISTS "link";
  `)
}
