import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// pricing_partner_logos.logo_id is NOT NULL but its FK to media uses
// ON DELETE set null, so deleting any media referenced by a partner logo
// aborts the txn with a NOT NULL violation. The partner logo row is
// meaningless without its image, so cascade is the right behaviour.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."pricing_partner_logos"
      DROP CONSTRAINT IF EXISTS "pricing_partner_logos_logo_id_media_id_fk";
    ALTER TABLE "public"."pricing_partner_logos"
      ADD CONSTRAINT "pricing_partner_logos_logo_id_media_id_fk"
      FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."pricing_partner_logos"
      DROP CONSTRAINT IF EXISTS "pricing_partner_logos_logo_id_media_id_fk";
    ALTER TABLE "public"."pricing_partner_logos"
      ADD CONSTRAINT "pricing_partner_logos_logo_id_media_id_fk"
      FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  `)
}
