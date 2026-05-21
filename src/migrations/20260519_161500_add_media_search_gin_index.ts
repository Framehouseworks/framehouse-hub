import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Create GIN index over media search fields for fast PostgreSQL Full-Text Search
    CREATE INDEX IF NOT EXISTS "media_search_idx" ON "public"."media" 
    USING gin(to_tsvector('english', 
      COALESCE(title, '') || ' ' || 
      COALESCE(filename, '') || ' ' || 
      COALESCE(technical_camera_model, '') || ' ' || 
      COALESCE(technical_lens_model, '') || ' ' || 
      COALESCE(shoot_name, '')
    ));
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Drop GIN search index safely
    DROP INDEX IF EXISTS "public"."media_search_idx";
  `)
}
