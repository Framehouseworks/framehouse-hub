import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pricing" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "pricing" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "pricing" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "pricing" ADD CONSTRAINT "pricing_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pricing_meta_image_idx" ON "pricing" USING btree ("meta_image_id");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pricing" DROP CONSTRAINT "pricing_meta_image_id_media_id_fk";
  
  DROP INDEX "pricing_meta_image_idx";
  ALTER TABLE "pricing" DROP COLUMN "meta_title";
  ALTER TABLE "pricing" DROP COLUMN "meta_description";
  ALTER TABLE "pricing" DROP COLUMN "meta_image_id";`)
}
