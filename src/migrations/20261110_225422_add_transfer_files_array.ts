import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "transfers_files" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"filename" varchar NOT NULL,
  	"filesize" numeric NOT NULL,
  	"mime_type" varchar DEFAULT 'application/octet-stream' NOT NULL,
  	"storage_path" varchar NOT NULL
  );
  
  ALTER TABLE "transfers_files" ADD CONSTRAINT "transfers_files_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."transfers"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "transfers_files_order_idx" ON "transfers_files" USING btree ("_order");
  CREATE INDEX "transfers_files_parent_id_idx" ON "transfers_files" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "transfers_files" CASCADE;`)
}
