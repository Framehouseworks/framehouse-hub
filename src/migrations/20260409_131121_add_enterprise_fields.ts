import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pricing_partner_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer NOT NULL
  );
  
  ALTER TABLE "pricing" ADD COLUMN "enterprise_heading" varchar DEFAULT 'Looking for a custom solution?';
  ALTER TABLE "pricing" ADD COLUMN "enterprise_cta_label" varchar DEFAULT 'Contact Sales';
  ALTER TABLE "pricing" ADD COLUMN "enterprise_description" varchar DEFAULT 'For high-volume production houses and enterprise teams requiring custom integrations, advanced security, and dedicated support.';
  ALTER TABLE "pricing_partner_logos" ADD CONSTRAINT "pricing_partner_logos_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pricing_partner_logos" ADD CONSTRAINT "pricing_partner_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pricing_partner_logos_order_idx" ON "pricing_partner_logos" USING btree ("_order");
  CREATE INDEX "pricing_partner_logos_parent_id_idx" ON "pricing_partner_logos" USING btree ("_parent_id");
  CREATE INDEX "pricing_partner_logos_logo_idx" ON "pricing_partner_logos" USING btree ("logo_id");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pricing_partner_logos" CASCADE;
  ALTER TABLE "pricing" DROP COLUMN "enterprise_heading";
  ALTER TABLE "pricing" DROP COLUMN "enterprise_cta_label";
  ALTER TABLE "pricing" DROP COLUMN "enterprise_description";`)
}
