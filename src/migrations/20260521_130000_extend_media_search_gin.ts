import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// FRH-52 phase C: extend the existing media_search_idx GIN index to
// include original_filename (added in phase A). This is what
// /api/media/search consumes via plainto_tsquery.
//
// NOTE: postgres requires CREATE INDEX CONCURRENTLY to run outside a
// transaction. Payload's migration runner already wraps each migration
// in its own transaction, so we use plain CREATE INDEX. In dev / CI on
// modest row counts this is fast enough; for prod with millions of
// rows we'd lift this into a manual maintenance window.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."media_search_idx";
    CREATE INDEX "media_search_idx" ON "public"."media"
    USING gin(to_tsvector('english',
      COALESCE(title, '') || ' ' ||
      COALESCE(filename, '') || ' ' ||
      COALESCE(original_filename, '') || ' ' ||
      COALESCE(technical_camera_model, '') || ' ' ||
      COALESCE(technical_lens_model, '') || ' ' ||
      COALESCE(shoot_name, '')
    ));
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Restore the previous index shape (without original_filename).
  await db.execute(sql`
    DROP INDEX IF EXISTS "public"."media_search_idx";
    CREATE INDEX "media_search_idx" ON "public"."media"
    USING gin(to_tsvector('english',
      COALESCE(title, '') || ' ' ||
      COALESCE(filename, '') || ' ' ||
      COALESCE(technical_camera_model, '') || ' ' ||
      COALESCE(technical_lens_model, '') || ' ' ||
      COALESCE(shoot_name, '')
    ));
  `)
}
