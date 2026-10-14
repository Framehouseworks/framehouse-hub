import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "portfolios_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "_portfolios_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  ALTER TABLE "portfolios_rels" ADD CONSTRAINT "portfolios_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portfolios_rels" ADD CONSTRAINT "portfolios_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_portfolios_v_rels" ADD CONSTRAINT "_portfolios_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_portfolios_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_portfolios_v_rels" ADD CONSTRAINT "_portfolios_v_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "portfolios_rels_order_idx" ON "portfolios_rels" USING btree ("order");
  CREATE INDEX "portfolios_rels_parent_idx" ON "portfolios_rels" USING btree ("parent_id");
  CREATE INDEX "portfolios_rels_path_idx" ON "portfolios_rels" USING btree ("path");
  CREATE INDEX "portfolios_rels_users_id_idx" ON "portfolios_rels" USING btree ("users_id");
  CREATE INDEX "_portfolios_v_rels_order_idx" ON "_portfolios_v_rels" USING btree ("order");
  CREATE INDEX "_portfolios_v_rels_parent_idx" ON "_portfolios_v_rels" USING btree ("parent_id");
  CREATE INDEX "_portfolios_v_rels_path_idx" ON "_portfolios_v_rels" USING btree ("path");
  CREATE INDEX "_portfolios_v_rels_users_id_idx" ON "_portfolios_v_rels" USING btree ("users_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "portfolios_rels" CASCADE;
  DROP TABLE "_portfolios_v_rels" CASCADE;`)
}
