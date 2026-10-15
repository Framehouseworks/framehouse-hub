import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_transfers_status" AS ENUM('active', 'revoked');
  CREATE TABLE "transfers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"share_hash" varchar NOT NULL,
  	"sender_id" integer NOT NULL,
  	"filename" varchar NOT NULL,
  	"filesize" numeric NOT NULL,
  	"mime_type" varchar DEFAULT 'application/octet-stream' NOT NULL,
  	"storage_path" varchar NOT NULL,
  	"title" varchar,
  	"message" varchar,
  	"status" "enum_transfers_status" DEFAULT 'active',
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"download_count" numeric DEFAULT 0,
  	"last_downloaded_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "transfers_id" integer;
  ALTER TABLE "transfers" ADD CONSTRAINT "transfers_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "transfers_share_hash_idx" ON "transfers" USING btree ("share_hash");
  CREATE INDEX "transfers_sender_idx" ON "transfers" USING btree ("sender_id");
  CREATE INDEX "transfers_status_idx" ON "transfers" USING btree ("status");
  CREATE INDEX "transfers_expires_at_idx" ON "transfers" USING btree ("expires_at");
  CREATE INDEX "transfers_updated_at_idx" ON "transfers" USING btree ("updated_at");
  CREATE INDEX "transfers_created_at_idx" ON "transfers" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transfers_fk" FOREIGN KEY ("transfers_id") REFERENCES "public"."transfers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_transfers_id_idx" ON "payload_locked_documents_rels" USING btree ("transfers_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "transfers" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "transfers" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_transfers_fk";
  
  DROP INDEX "payload_locked_documents_rels_transfers_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "transfers_id";
  DROP TYPE "public"."enum_transfers_status";`)
}
