import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload: _payload, req: _req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pricing_plans_summary_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"feature" varchar NOT NULL
  );
  
  CREATE TABLE "pricing_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"price_monthly" varchar NOT NULL,
  	"price_annual" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"cta_text" varchar NOT NULL,
  	"is_recommended" boolean DEFAULT false
  );
  
  CREATE TABLE "pricing_feature_categories_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"plan1_value" varchar,
  	"plan2_value" varchar,
  	"plan3_value" varchar
  );
  
  CREATE TABLE "pricing_feature_categories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "pricing" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "pricing_plans_summary_features" ADD CONSTRAINT "pricing_plans_summary_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pricing_plans"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pricing_feature_categories_features" ADD CONSTRAINT "pricing_feature_categories_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pricing_feature_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pricing_feature_categories" ADD CONSTRAINT "pricing_feature_categories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pricing"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pricing_plans_summary_features_order_idx" ON "pricing_plans_summary_features" USING btree ("_order");
  CREATE INDEX "pricing_plans_summary_features_parent_id_idx" ON "pricing_plans_summary_features" USING btree ("_parent_id");
  CREATE INDEX "pricing_plans_order_idx" ON "pricing_plans" USING btree ("_order");
  CREATE INDEX "pricing_plans_parent_id_idx" ON "pricing_plans" USING btree ("_parent_id");
  CREATE INDEX "pricing_feature_categories_features_order_idx" ON "pricing_feature_categories_features" USING btree ("_order");
  CREATE INDEX "pricing_feature_categories_features_parent_id_idx" ON "pricing_feature_categories_features" USING btree ("_parent_id");
  CREATE INDEX "pricing_feature_categories_order_idx" ON "pricing_feature_categories" USING btree ("_order");
  CREATE INDEX "pricing_feature_categories_parent_id_idx" ON "pricing_feature_categories" USING btree ("_parent_id");`)
}

export async function down({ db, payload: _payload, req: _req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "pricing_plans_summary_features" CASCADE;
  DROP TABLE "pricing_plans" CASCADE;
  DROP TABLE "pricing_feature_categories_features" CASCADE;
  DROP TABLE "pricing_feature_categories" CASCADE;
  DROP TABLE "pricing" CASCADE;`)
}
