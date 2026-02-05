import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN IF NOT EXISTS "alt" varchar;
  ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN IF NOT EXISTS "caption" varchar;
  ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN IF NOT EXISTS "link" varchar;
  ALTER TABLE "portfolios_blocks_grid_items" ADD COLUMN IF NOT EXISTS "instance_id" varchar;
  ALTER TABLE "portfolios_blocks_grid" ADD COLUMN IF NOT EXISTS "items_order" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN "alt";
  ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN "caption";
  ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN "link";
  ALTER TABLE "portfolios_blocks_grid_items" DROP COLUMN "instance_id";
  ALTER TABLE "portfolios_blocks_grid" DROP COLUMN "items_order";`)
}
