import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_portfolio_defaults_default_theme" AS ENUM('light', 'dark');
  CREATE TYPE "public"."enum_users_portfolio_defaults_default_visibility" AS ENUM('private', 'password', 'public');
  ALTER TABLE "users" ADD COLUMN "studio_name" varchar;
  ALTER TABLE "users" ADD COLUMN "bio" varchar;
  ALTER TABLE "users" ADD COLUMN "studio_logo_id" integer;
  ALTER TABLE "users" ADD COLUMN "portfolio_defaults_default_theme" "enum_users_portfolio_defaults_default_theme" DEFAULT 'light';
  ALTER TABLE "users" ADD COLUMN "portfolio_defaults_default_visibility" "enum_users_portfolio_defaults_default_visibility" DEFAULT 'private';
  ALTER TABLE "users" ADD COLUMN "portfolio_defaults_show_watermark" boolean DEFAULT false;
  ALTER TABLE "users" ADD CONSTRAINT "users_studio_logo_id_media_id_fk" FOREIGN KEY ("studio_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_studio_logo_idx" ON "users" USING btree ("studio_logo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP CONSTRAINT "users_studio_logo_id_media_id_fk";
  
  DROP INDEX "users_studio_logo_idx";
  ALTER TABLE "users" DROP COLUMN "studio_name";
  ALTER TABLE "users" DROP COLUMN "bio";
  ALTER TABLE "users" DROP COLUMN "studio_logo_id";
  ALTER TABLE "users" DROP COLUMN "portfolio_defaults_default_theme";
  ALTER TABLE "users" DROP COLUMN "portfolio_defaults_default_visibility";
  ALTER TABLE "users" DROP COLUMN "portfolio_defaults_show_watermark";
  DROP TYPE "public"."enum_users_portfolio_defaults_default_theme";
  DROP TYPE "public"."enum_users_portfolio_defaults_default_visibility";`)
}
