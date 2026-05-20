import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// portfolios_blocks_grid_items.media_id and portfolios_blocks_featured.media_id
// are NOT NULL but their FKs use ON DELETE set null, which is contradictory:
// deleting a Media row referenced by a Portfolio block aborts the transaction
// with a NOT NULL violation and poisons the rest of the cascade
// (payload_preferences cleanup etc. then error with 25P02).
//
// Both blocks treat the image as the load-bearing element, so cascading the
// block row away with the media is the correct semantic.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."portfolios_blocks_grid_items"
      DROP CONSTRAINT IF EXISTS "portfolios_blocks_grid_items_media_id_media_id_fk";
    ALTER TABLE "public"."portfolios_blocks_grid_items"
      ADD CONSTRAINT "portfolios_blocks_grid_items_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

    ALTER TABLE "public"."portfolios_blocks_featured"
      DROP CONSTRAINT IF EXISTS "portfolios_blocks_featured_media_id_media_id_fk";
    ALTER TABLE "public"."portfolios_blocks_featured"
      ADD CONSTRAINT "portfolios_blocks_featured_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."portfolios_blocks_grid_items"
      DROP CONSTRAINT IF EXISTS "portfolios_blocks_grid_items_media_id_media_id_fk";
    ALTER TABLE "public"."portfolios_blocks_grid_items"
      ADD CONSTRAINT "portfolios_blocks_grid_items_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;

    ALTER TABLE "public"."portfolios_blocks_featured"
      DROP CONSTRAINT IF EXISTS "portfolios_blocks_featured_media_id_media_id_fk";
    ALTER TABLE "public"."portfolios_blocks_featured"
      ADD CONSTRAINT "portfolios_blocks_featured_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  `)
}
