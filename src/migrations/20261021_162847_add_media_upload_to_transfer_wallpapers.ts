import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transfer_wallpapers" ALTER COLUMN "asset_url" DROP NOT NULL;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "media_id" integer;
  ALTER TABLE "transfer_wallpapers" ADD COLUMN "mobile_media_id" integer;
  ALTER TABLE "transfer_wallpapers" ADD CONSTRAINT "transfer_wallpapers_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "transfer_wallpapers" ADD CONSTRAINT "transfer_wallpapers_mobile_media_id_media_id_fk" FOREIGN KEY ("mobile_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "transfer_wallpapers_media_idx" ON "transfer_wallpapers" USING btree ("media_id");
  CREATE INDEX "transfer_wallpapers_mobile_media_idx" ON "transfer_wallpapers" USING btree ("mobile_media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transfer_wallpapers" DROP CONSTRAINT "transfer_wallpapers_media_id_media_id_fk";
  
  ALTER TABLE "transfer_wallpapers" DROP CONSTRAINT "transfer_wallpapers_mobile_media_id_media_id_fk";
  
  DROP INDEX "transfer_wallpapers_media_idx";
  DROP INDEX "transfer_wallpapers_mobile_media_idx";
  ALTER TABLE "transfer_wallpapers" ALTER COLUMN "asset_url" SET NOT NULL;
  ALTER TABLE "transfer_wallpapers" DROP COLUMN "media_id";
  ALTER TABLE "transfer_wallpapers" DROP COLUMN "mobile_media_id";`)
}
