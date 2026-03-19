import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "portfolios" ADD COLUMN "name" varchar;`)

  // Populate name from slug using SQL (Initial Caps and spaces)
  await db.execute(sql`
    UPDATE "portfolios" 
    SET "name" = initcap(replace("slug", '-', ' '))
    WHERE "name" IS NULL;
  `)

  // Fallback for anything still null
  await db.execute(sql`UPDATE "portfolios" SET "name" = 'Untitled Portfolio' WHERE "name" IS NULL;`)

  await db.execute(sql`ALTER TABLE "portfolios" ALTER COLUMN "name" SET NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "portfolios" DROP COLUMN "name";`)
}
