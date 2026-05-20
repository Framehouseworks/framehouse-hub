import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Aligns the schema with Payload's regen output. The previous pair of
// migrations (20260520_180000 / 190000) used ON DELETE CASCADE to work
// around NOT NULL + SET NULL contradictions, but Payload's
// `generate:db-schema` always emits SET NULL for relationship fields,
// causing perpetual drift.
//
// Now that the corresponding fields in src/collections/Portfolios/index.ts
// and src/globals/Pricing.ts are `required: false`, we can drop NOT NULL
// on the FK columns and revert the FK action to SET NULL — matching the
// generated snapshot exactly.
//
// Block rows referencing a deleted Media now survive with a null
// media_id / logo_id. The UI tolerates this via the existing fallback
// chain (`thumbnailUrl || proxyUrl || originalUrl || url`).
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."portfolios_blocks_grid_items"
      DROP CONSTRAINT IF EXISTS "portfolios_blocks_grid_items_media_id_media_id_fk";
    ALTER TABLE "public"."portfolios_blocks_grid_items"
      ALTER COLUMN "media_id" DROP NOT NULL;
    ALTER TABLE "public"."portfolios_blocks_grid_items"
      ADD CONSTRAINT "portfolios_blocks_grid_items_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    ALTER TABLE "public"."portfolios_blocks_featured"
      DROP CONSTRAINT IF EXISTS "portfolios_blocks_featured_media_id_media_id_fk";
    ALTER TABLE "public"."portfolios_blocks_featured"
      ALTER COLUMN "media_id" DROP NOT NULL;
    ALTER TABLE "public"."portfolios_blocks_featured"
      ADD CONSTRAINT "portfolios_blocks_featured_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    ALTER TABLE "public"."pricing_partner_logos"
      DROP CONSTRAINT IF EXISTS "pricing_partner_logos_logo_id_media_id_fk";
    ALTER TABLE "public"."pricing_partner_logos"
      ALTER COLUMN "logo_id" DROP NOT NULL;
    ALTER TABLE "public"."pricing_partner_logos"
      ADD CONSTRAINT "pricing_partner_logos_logo_id_media_id_fk"
      FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Restoring NOT NULL is only safe if no NULL rows exist; we leave that
  // validation to the operator. The FK action is restored to the prior
  // CASCADE for symmetry with 20260520_180000 / 190000.
  await db.execute(sql`
    ALTER TABLE "public"."portfolios_blocks_grid_items"
      DROP CONSTRAINT IF EXISTS "portfolios_blocks_grid_items_media_id_media_id_fk";
    ALTER TABLE "public"."portfolios_blocks_grid_items"
      ALTER COLUMN "media_id" SET NOT NULL;
    ALTER TABLE "public"."portfolios_blocks_grid_items"
      ADD CONSTRAINT "portfolios_blocks_grid_items_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

    ALTER TABLE "public"."portfolios_blocks_featured"
      DROP CONSTRAINT IF EXISTS "portfolios_blocks_featured_media_id_media_id_fk";
    ALTER TABLE "public"."portfolios_blocks_featured"
      ALTER COLUMN "media_id" SET NOT NULL;
    ALTER TABLE "public"."portfolios_blocks_featured"
      ADD CONSTRAINT "portfolios_blocks_featured_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

    ALTER TABLE "public"."pricing_partner_logos"
      DROP CONSTRAINT IF EXISTS "pricing_partner_logos_logo_id_media_id_fk";
    ALTER TABLE "public"."pricing_partner_logos"
      ALTER COLUMN "logo_id" SET NOT NULL;
    ALTER TABLE "public"."pricing_partner_logos"
      ADD CONSTRAINT "pricing_partner_logos_logo_id_media_id_fk"
      FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  `)
}
