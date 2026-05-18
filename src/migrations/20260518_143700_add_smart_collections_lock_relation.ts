import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- 1. Add smart_collections_id relationship column to locked documents relations
    ALTER TABLE "public"."payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "smart_collections_id" integer;
    
    -- 2. Add Foreign Key Constraint safely
    DO $$ BEGIN
      ALTER TABLE "public"."payload_locked_documents_rels" 
        ADD CONSTRAINT "payload_locked_documents_rels_smart_collections_id_fk" 
        FOREIGN KEY ("smart_collections_id") 
        REFERENCES "public"."smart_collections"("id") 
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
    
    -- 3. Create Index for performance
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_smart_collections_id_idx" 
      ON "public"."payload_locked_documents_rels" USING btree ("smart_collections_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- 1. Drop Index
    DROP INDEX IF EXISTS "public"."payload_locked_documents_rels_smart_collections_id_idx";
    
    -- 2. Drop Foreign Key Constraint
    ALTER TABLE "public"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_smart_collections_id_fk";
    
    -- 3. Drop Column
    ALTER TABLE "public"."payload_locked_documents_rels" DROP COLUMN IF EXISTS "smart_collections_id";
  `)
}
