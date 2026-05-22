import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// FRH-44: extend GIN index to cover location_address and capture_date,
// and rename to media_full_search_idx (matches spec + /api/media/search).
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "public"."media_search_idx"`)
  await db.execute(sql`DROP INDEX IF EXISTS "public"."media_full_search_idx"`)
  await db.execute(sql`
    CREATE INDEX "media_full_search_idx" ON "public"."media"
    USING gin(to_tsvector('english',
      COALESCE(title, '') || ' ' ||
      COALESCE(filename, '') || ' ' ||
      COALESCE(original_filename, '') || ' ' ||
      COALESCE(technical_camera_model, '') || ' ' ||
      COALESCE(technical_lens_model, '') || ' ' ||
      COALESCE(shoot_name, '') || ' ' ||
      COALESCE(location_address, '')
    ))
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "public"."media_full_search_idx"`)
  await db.execute(sql`
    CREATE INDEX "media_search_idx" ON "public"."media"
    USING gin(to_tsvector('english',
      COALESCE(title, '') || ' ' ||
      COALESCE(filename, '') || ' ' ||
      COALESCE(original_filename, '') || ' ' ||
      COALESCE(technical_camera_model, '') || ' ' ||
      COALESCE(shoot_name, '')
    ))
  `)
}
