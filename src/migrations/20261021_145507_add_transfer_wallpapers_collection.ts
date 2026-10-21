import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_transfer_wallpapers_sponsorship_status" AS ENUM('editorial', 'sponsored');
  CREATE TYPE "public"."enum_transfer_wallpapers_status" AS ENUM('active', 'inactive', 'archived');
  CREATE TYPE "public"."enum_transfer_wallpapers_focal_point" AS ENUM('center', 'top', 'bottom', 'left', 'right');
  CREATE TABLE "transfer_wallpapers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"asset_url" varchar NOT NULL,
  	"mobile_asset_url" varchar,
  	"artist_credit" varchar NOT NULL,
  	"click_through_url" varchar,
  	"sponsorship_status" "enum_transfer_wallpapers_sponsorship_status" DEFAULT 'editorial' NOT NULL,
  	"status" "enum_transfer_wallpapers_status" DEFAULT 'active' NOT NULL,
  	"display_duration_seconds" numeric DEFAULT 45 NOT NULL,
  	"start_date" timestamp(3) with time zone NOT NULL,
  	"end_date" timestamp(3) with time zone,
  	"weight" numeric DEFAULT 100 NOT NULL,
  	"focal_point" "enum_transfer_wallpapers_focal_point" DEFAULT 'center',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "transfer_wallpapers_id" integer;
  CREATE INDEX "transfer_wallpapers_status_idx" ON "transfer_wallpapers" USING btree ("status");
  CREATE INDEX "transfer_wallpapers_start_date_idx" ON "transfer_wallpapers" USING btree ("start_date");
  CREATE INDEX "transfer_wallpapers_end_date_idx" ON "transfer_wallpapers" USING btree ("end_date");
  CREATE INDEX "transfer_wallpapers_weight_idx" ON "transfer_wallpapers" USING btree ("weight");
  CREATE INDEX "transfer_wallpapers_updated_at_idx" ON "transfer_wallpapers" USING btree ("updated_at");
  CREATE INDEX "transfer_wallpapers_created_at_idx" ON "transfer_wallpapers" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transfer_wallpapers_fk" FOREIGN KEY ("transfer_wallpapers_id") REFERENCES "public"."transfer_wallpapers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_transfer_wallpapers_id_idx" ON "payload_locked_documents_rels" USING btree ("transfer_wallpapers_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transfer_wallpapers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "transfer_wallpapers" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_transfer_wallpapers_fk";
  
  DROP INDEX "payload_locked_documents_rels_transfer_wallpapers_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "transfer_wallpapers_id";
  DROP TYPE "public"."enum_transfer_wallpapers_sponsorship_status";
  DROP TYPE "public"."enum_transfer_wallpapers_status";
  DROP TYPE "public"."enum_transfer_wallpapers_focal_point";`)
}
