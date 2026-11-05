import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_admin_activity_logs_action_type" ADD VALUE 'transfer_password_set' BEFORE 'field_override';
  ALTER TYPE "public"."enum_admin_activity_logs_action_type" ADD VALUE 'transfer_password_cleared' BEFORE 'field_override';
  ALTER TABLE "transfers" ADD COLUMN "password_enabled" boolean DEFAULT false;
  ALTER TABLE "transfers" ADD COLUMN "password_hash" varchar;
  ALTER TABLE "transfers" ADD COLUMN "password_salt" varchar;
  ALTER TABLE "transfers" ADD COLUMN "password_version" numeric DEFAULT 0;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "admin_activity_logs" ALTER COLUMN "action_type" SET DATA TYPE text;
  DROP TYPE "public"."enum_admin_activity_logs_action_type";
  CREATE TYPE "public"."enum_admin_activity_logs_action_type" AS ENUM('inspect_account', 'launch_diagnostic', 'terminate_diagnostic', 'diagnostic_expired', 'portfolio_password_reset', 'portfolio_visibility_change', 'field_override', 'account_role_change');
  ALTER TABLE "admin_activity_logs" ALTER COLUMN "action_type" SET DATA TYPE "public"."enum_admin_activity_logs_action_type" USING "action_type"::"public"."enum_admin_activity_logs_action_type";
  ALTER TABLE "transfers" DROP COLUMN "password_enabled";
  ALTER TABLE "transfers" DROP COLUMN "password_hash";
  ALTER TABLE "transfers" DROP COLUMN "password_salt";
  ALTER TABLE "transfers" DROP COLUMN "password_version";`)
}
