import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "portfolio_client_sessions_saved_selection_ids" ALTER COLUMN "media_id" SET DATA TYPE varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "portfolio_client_sessions_saved_selection_ids" ALTER COLUMN "media_id" SET DATA TYPE numeric;`)
}
