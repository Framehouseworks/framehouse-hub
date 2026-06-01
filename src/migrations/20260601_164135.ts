import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // New enum types for block background colours
  await db.execute(sql`
    CREATE TYPE "public"."enum_pages_blocks_article_grid_background_color" AS ENUM('white', 'surface_low');
    CREATE TYPE "public"."enum_pages_blocks_download_grid_background_color" AS ENUM('white', 'surface_low');
    CREATE TYPE "public"."enum_pages_blocks_tutorial_grid_background_color" AS ENUM('white', 'surface_low');
    CREATE TYPE "public"."enum__pages_v_blocks_article_grid_background_color" AS ENUM('white', 'surface_low');
    CREATE TYPE "public"."enum__pages_v_blocks_download_grid_background_color" AS ENUM('white', 'surface_low');
    CREATE TYPE "public"."enum__pages_v_blocks_tutorial_grid_background_color" AS ENUM('white', 'surface_low');
  `)

  // New enum types for Articles collection
  await db.execute(sql`
    CREATE TYPE "public"."enum_articles_category" AS ENUM('guide', 'workflow', 'news', 'tips');
    CREATE TYPE "public"."enum_articles_status" AS ENUM('draft', 'published');
    CREATE TYPE "public"."enum__articles_v_version_category" AS ENUM('guide', 'workflow', 'news', 'tips');
    CREATE TYPE "public"."enum__articles_v_version_status" AS ENUM('draft', 'published');
  `)

  // New enum types for Downloads collection
  await db.execute(sql`
    CREATE TYPE "public"."enum_downloads_file_type" AS ENUM('lut', 'template', 'preset', 'other');
    CREATE TYPE "public"."enum_downloads_status" AS ENUM('draft', 'published');
    CREATE TYPE "public"."enum__downloads_v_version_file_type" AS ENUM('lut', 'template', 'preset', 'other');
    CREATE TYPE "public"."enum__downloads_v_version_status" AS ENUM('draft', 'published');
  `)

  // New enum types for Tutorials collection
  await db.execute(sql`
    CREATE TYPE "public"."enum_tutorials_category" AS ENUM('getting-started', 'organise', 'publish', 'advanced');
    CREATE TYPE "public"."enum_tutorials_difficulty" AS ENUM('beginner', 'intermediate', 'advanced');
    CREATE TYPE "public"."enum_tutorials_status" AS ENUM('draft', 'published');
    CREATE TYPE "public"."enum__tutorials_v_version_category" AS ENUM('getting-started', 'organise', 'publish', 'advanced');
    CREATE TYPE "public"."enum__tutorials_v_version_difficulty" AS ENUM('beginner', 'intermediate', 'advanced');
    CREATE TYPE "public"."enum__tutorials_v_version_status" AS ENUM('draft', 'published');
  `)

  // Extend media_type enum with new values not added by prior migrations.
  // 'raw' was added in 20260513_201300 — skip it here.
  await db.execute(sql`
    ALTER TYPE "public"."enum_media_media_type" ADD VALUE IF NOT EXISTS 'audio';
    ALTER TYPE "public"."enum_media_media_type" ADD VALUE IF NOT EXISTS 'document';
    ALTER TYPE "public"."enum_media_media_type" ADD VALUE IF NOT EXISTS 'unclassified';
  `)

  // New page block tables
  await db.execute(sql`
    CREATE TABLE "pages_blocks_article_grid" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "heading" varchar DEFAULT 'Articles & Guides',
      "subheading" varchar DEFAULT 'Insights and workflows from the Framehouse team.',
      "view_all_label" varchar DEFAULT 'View all articles',
      "background_color" "enum_pages_blocks_article_grid_background_color" DEFAULT 'white',
      "block_name" varchar
    );

    CREATE TABLE "pages_blocks_download_grid" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "heading" varchar DEFAULT 'Free Downloads',
      "subheading" varchar DEFAULT 'LUTs, templates, and presets — free for registered users.',
      "background_color" "enum_pages_blocks_download_grid_background_color" DEFAULT 'surface_low',
      "block_name" varchar
    );

    CREATE TABLE "pages_blocks_tutorial_grid" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "heading" varchar DEFAULT 'Platform Tutorials',
      "subheading" varchar DEFAULT 'Step-by-step guides for getting the most out of Framehouse Hub.',
      "background_color" "enum_pages_blocks_tutorial_grid_background_color" DEFAULT 'white',
      "block_name" varchar
    );

    CREATE TABLE "_pages_v_blocks_article_grid" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "heading" varchar DEFAULT 'Articles & Guides',
      "subheading" varchar DEFAULT 'Insights and workflows from the Framehouse team.',
      "view_all_label" varchar DEFAULT 'View all articles',
      "background_color" "enum__pages_v_blocks_article_grid_background_color" DEFAULT 'white',
      "_uuid" varchar,
      "block_name" varchar
    );

    CREATE TABLE "_pages_v_blocks_download_grid" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "heading" varchar DEFAULT 'Free Downloads',
      "subheading" varchar DEFAULT 'LUTs, templates, and presets — free for registered users.',
      "background_color" "enum__pages_v_blocks_download_grid_background_color" DEFAULT 'surface_low',
      "_uuid" varchar,
      "block_name" varchar
    );

    CREATE TABLE "_pages_v_blocks_tutorial_grid" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "heading" varchar DEFAULT 'Platform Tutorials',
      "subheading" varchar DEFAULT 'Step-by-step guides for getting the most out of Framehouse Hub.',
      "background_color" "enum__pages_v_blocks_tutorial_grid_background_color" DEFAULT 'white',
      "_uuid" varchar,
      "block_name" varchar
    );
  `)

  // Articles collection tables
  await db.execute(sql`
    CREATE TABLE "articles" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar,
      "excerpt" varchar,
      "category" "enum_articles_category" DEFAULT 'guide',
      "read_time" numeric DEFAULT 5,
      "hero_image_id" integer,
      "published_on" timestamp(3) with time zone,
      "content" jsonb,
      "meta_title" varchar,
      "meta_image_id" integer,
      "meta_description" varchar,
      "slug" varchar,
      "slug_lock" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "_status" "enum_articles_status" DEFAULT 'draft'
    );

    CREATE TABLE "_articles_v" (
      "id" serial PRIMARY KEY NOT NULL,
      "parent_id" integer,
      "version_title" varchar,
      "version_excerpt" varchar,
      "version_category" "enum__articles_v_version_category" DEFAULT 'guide',
      "version_read_time" numeric DEFAULT 5,
      "version_hero_image_id" integer,
      "version_published_on" timestamp(3) with time zone,
      "version_content" jsonb,
      "version_meta_title" varchar,
      "version_meta_image_id" integer,
      "version_meta_description" varchar,
      "version_slug" varchar,
      "version_slug_lock" boolean DEFAULT true,
      "version_updated_at" timestamp(3) with time zone,
      "version_created_at" timestamp(3) with time zone,
      "version__status" "enum__articles_v_version_status" DEFAULT 'draft',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "latest" boolean,
      "autosave" boolean
    );
  `)

  // Downloads collection tables
  await db.execute(sql`
    CREATE TABLE "downloads_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "tag" varchar
    );

    CREATE TABLE "downloads" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar,
      "description" varchar,
      "file_type" "enum_downloads_file_type" DEFAULT 'lut',
      "thumbnail_id" integer,
      "download_file_id" integer,
      "external_url" varchar,
      "requires_account" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "_status" "enum_downloads_status" DEFAULT 'draft'
    );

    CREATE TABLE "_downloads_v_version_tags" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "tag" varchar,
      "_uuid" varchar
    );

    CREATE TABLE "_downloads_v" (
      "id" serial PRIMARY KEY NOT NULL,
      "parent_id" integer,
      "version_title" varchar,
      "version_description" varchar,
      "version_file_type" "enum__downloads_v_version_file_type" DEFAULT 'lut',
      "version_thumbnail_id" integer,
      "version_download_file_id" integer,
      "version_external_url" varchar,
      "version_requires_account" boolean DEFAULT true,
      "version_updated_at" timestamp(3) with time zone,
      "version_created_at" timestamp(3) with time zone,
      "version__status" "enum__downloads_v_version_status" DEFAULT 'draft',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "latest" boolean,
      "autosave" boolean
    );
  `)

  // Tutorials collection tables
  await db.execute(sql`
    CREATE TABLE "tutorials_steps" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "step_title" varchar,
      "step_content" jsonb,
      "step_image_id" integer
    );

    CREATE TABLE "tutorials" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar,
      "description" varchar,
      "category" "enum_tutorials_category" DEFAULT 'getting-started',
      "difficulty" "enum_tutorials_difficulty" DEFAULT 'beginner',
      "duration" varchar,
      "order" numeric DEFAULT 0,
      "hero_image_id" integer,
      "meta_title" varchar,
      "meta_image_id" integer,
      "meta_description" varchar,
      "slug" varchar,
      "slug_lock" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "_status" "enum_tutorials_status" DEFAULT 'draft'
    );

    CREATE TABLE "_tutorials_v_version_steps" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "step_title" varchar,
      "step_content" jsonb,
      "step_image_id" integer,
      "_uuid" varchar
    );

    CREATE TABLE "_tutorials_v" (
      "id" serial PRIMARY KEY NOT NULL,
      "parent_id" integer,
      "version_title" varchar,
      "version_description" varchar,
      "version_category" "enum__tutorials_v_version_category" DEFAULT 'getting-started',
      "version_difficulty" "enum__tutorials_v_version_difficulty" DEFAULT 'beginner',
      "version_duration" varchar,
      "version_order" numeric DEFAULT 0,
      "version_hero_image_id" integer,
      "version_meta_title" varchar,
      "version_meta_image_id" integer,
      "version_meta_description" varchar,
      "version_slug" varchar,
      "version_slug_lock" boolean DEFAULT true,
      "version_updated_at" timestamp(3) with time zone,
      "version_created_at" timestamp(3) with time zone,
      "version__status" "enum__tutorials_v_version_status" DEFAULT 'draft',
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "latest" boolean,
      "autosave" boolean
    );
  `)

  // New relationship columns on junction tables
  await db.execute(sql`
    ALTER TABLE "pages_rels" ADD COLUMN "articles_id" integer;
    ALTER TABLE "pages_rels" ADD COLUMN "downloads_id" integer;
    ALTER TABLE "pages_rels" ADD COLUMN "tutorials_id" integer;
    ALTER TABLE "_pages_v_rels" ADD COLUMN "articles_id" integer;
    ALTER TABLE "_pages_v_rels" ADD COLUMN "downloads_id" integer;
    ALTER TABLE "_pages_v_rels" ADD COLUMN "tutorials_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "articles_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "downloads_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tutorials_id" integer;
  `)

  // Foreign key constraints — block tables
  await db.execute(sql`
    ALTER TABLE "pages_blocks_article_grid" ADD CONSTRAINT "pages_blocks_article_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "pages_blocks_download_grid" ADD CONSTRAINT "pages_blocks_download_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "pages_blocks_tutorial_grid" ADD CONSTRAINT "pages_blocks_tutorial_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_pages_v_blocks_article_grid" ADD CONSTRAINT "_pages_v_blocks_article_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_pages_v_blocks_download_grid" ADD CONSTRAINT "_pages_v_blocks_download_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_pages_v_blocks_tutorial_grid" ADD CONSTRAINT "_pages_v_blocks_tutorial_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  `)

  // Foreign key constraints — articles
  await db.execute(sql`
    ALTER TABLE "articles" ADD CONSTRAINT "articles_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "articles" ADD CONSTRAINT "articles_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_parent_id_articles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  `)

  // Foreign key constraints — downloads
  await db.execute(sql`
    ALTER TABLE "downloads_tags" ADD CONSTRAINT "downloads_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."downloads"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "downloads" ADD CONSTRAINT "downloads_thumbnail_id_media_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "downloads" ADD CONSTRAINT "downloads_download_file_id_media_id_fk" FOREIGN KEY ("download_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_downloads_v_version_tags" ADD CONSTRAINT "_downloads_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_downloads_v"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_downloads_v" ADD CONSTRAINT "_downloads_v_parent_id_downloads_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."downloads"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_downloads_v" ADD CONSTRAINT "_downloads_v_version_thumbnail_id_media_id_fk" FOREIGN KEY ("version_thumbnail_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_downloads_v" ADD CONSTRAINT "_downloads_v_version_download_file_id_media_id_fk" FOREIGN KEY ("version_download_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  `)

  // Foreign key constraints — tutorials
  await db.execute(sql`
    ALTER TABLE "tutorials_steps" ADD CONSTRAINT "tutorials_steps_step_image_id_media_id_fk" FOREIGN KEY ("step_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "tutorials_steps" ADD CONSTRAINT "tutorials_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_tutorials_v_version_steps" ADD CONSTRAINT "_tutorials_v_version_steps_step_image_id_media_id_fk" FOREIGN KEY ("step_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_tutorials_v_version_steps" ADD CONSTRAINT "_tutorials_v_version_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tutorials_v"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_tutorials_v" ADD CONSTRAINT "_tutorials_v_parent_id_tutorials_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tutorials"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_tutorials_v" ADD CONSTRAINT "_tutorials_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_tutorials_v" ADD CONSTRAINT "_tutorials_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  `)

  // Foreign key constraints — junction tables
  await db.execute(sql`
    ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_downloads_fk" FOREIGN KEY ("downloads_id") REFERENCES "public"."downloads"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_tutorials_fk" FOREIGN KEY ("tutorials_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_downloads_fk" FOREIGN KEY ("downloads_id") REFERENCES "public"."downloads"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_tutorials_fk" FOREIGN KEY ("tutorials_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_downloads_fk" FOREIGN KEY ("downloads_id") REFERENCES "public"."downloads"("id") ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tutorials_fk" FOREIGN KEY ("tutorials_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;
  `)

  // Indexes — block tables
  await db.execute(sql`
    CREATE INDEX "pages_blocks_article_grid_order_idx" ON "pages_blocks_article_grid" USING btree ("_order");
    CREATE INDEX "pages_blocks_article_grid_parent_id_idx" ON "pages_blocks_article_grid" USING btree ("_parent_id");
    CREATE INDEX "pages_blocks_article_grid_path_idx" ON "pages_blocks_article_grid" USING btree ("_path");
    CREATE INDEX "pages_blocks_download_grid_order_idx" ON "pages_blocks_download_grid" USING btree ("_order");
    CREATE INDEX "pages_blocks_download_grid_parent_id_idx" ON "pages_blocks_download_grid" USING btree ("_parent_id");
    CREATE INDEX "pages_blocks_download_grid_path_idx" ON "pages_blocks_download_grid" USING btree ("_path");
    CREATE INDEX "pages_blocks_tutorial_grid_order_idx" ON "pages_blocks_tutorial_grid" USING btree ("_order");
    CREATE INDEX "pages_blocks_tutorial_grid_parent_id_idx" ON "pages_blocks_tutorial_grid" USING btree ("_parent_id");
    CREATE INDEX "pages_blocks_tutorial_grid_path_idx" ON "pages_blocks_tutorial_grid" USING btree ("_path");
    CREATE INDEX "_pages_v_blocks_article_grid_order_idx" ON "_pages_v_blocks_article_grid" USING btree ("_order");
    CREATE INDEX "_pages_v_blocks_article_grid_parent_id_idx" ON "_pages_v_blocks_article_grid" USING btree ("_parent_id");
    CREATE INDEX "_pages_v_blocks_article_grid_path_idx" ON "_pages_v_blocks_article_grid" USING btree ("_path");
    CREATE INDEX "_pages_v_blocks_download_grid_order_idx" ON "_pages_v_blocks_download_grid" USING btree ("_order");
    CREATE INDEX "_pages_v_blocks_download_grid_parent_id_idx" ON "_pages_v_blocks_download_grid" USING btree ("_parent_id");
    CREATE INDEX "_pages_v_blocks_download_grid_path_idx" ON "_pages_v_blocks_download_grid" USING btree ("_path");
    CREATE INDEX "_pages_v_blocks_tutorial_grid_order_idx" ON "_pages_v_blocks_tutorial_grid" USING btree ("_order");
    CREATE INDEX "_pages_v_blocks_tutorial_grid_parent_id_idx" ON "_pages_v_blocks_tutorial_grid" USING btree ("_parent_id");
    CREATE INDEX "_pages_v_blocks_tutorial_grid_path_idx" ON "_pages_v_blocks_tutorial_grid" USING btree ("_path");
  `)

  // Indexes — articles
  await db.execute(sql`
    CREATE INDEX "articles_hero_image_idx" ON "articles" USING btree ("hero_image_id");
    CREATE INDEX "articles_meta_meta_image_idx" ON "articles" USING btree ("meta_image_id");
    CREATE INDEX "articles_slug_idx" ON "articles" USING btree ("slug");
    CREATE INDEX "articles_updated_at_idx" ON "articles" USING btree ("updated_at");
    CREATE INDEX "articles_created_at_idx" ON "articles" USING btree ("created_at");
    CREATE INDEX "articles__status_idx" ON "articles" USING btree ("_status");
    CREATE INDEX "_articles_v_parent_idx" ON "_articles_v" USING btree ("parent_id");
    CREATE INDEX "_articles_v_version_version_hero_image_idx" ON "_articles_v" USING btree ("version_hero_image_id");
    CREATE INDEX "_articles_v_version_meta_version_meta_image_idx" ON "_articles_v" USING btree ("version_meta_image_id");
    CREATE INDEX "_articles_v_version_version_slug_idx" ON "_articles_v" USING btree ("version_slug");
    CREATE INDEX "_articles_v_version_version_updated_at_idx" ON "_articles_v" USING btree ("version_updated_at");
    CREATE INDEX "_articles_v_version_version_created_at_idx" ON "_articles_v" USING btree ("version_created_at");
    CREATE INDEX "_articles_v_version_version__status_idx" ON "_articles_v" USING btree ("version__status");
    CREATE INDEX "_articles_v_created_at_idx" ON "_articles_v" USING btree ("created_at");
    CREATE INDEX "_articles_v_updated_at_idx" ON "_articles_v" USING btree ("updated_at");
    CREATE INDEX "_articles_v_latest_idx" ON "_articles_v" USING btree ("latest");
    CREATE INDEX "_articles_v_autosave_idx" ON "_articles_v" USING btree ("autosave");
  `)

  // Indexes — downloads
  await db.execute(sql`
    CREATE INDEX "downloads_tags_order_idx" ON "downloads_tags" USING btree ("_order");
    CREATE INDEX "downloads_tags_parent_id_idx" ON "downloads_tags" USING btree ("_parent_id");
    CREATE INDEX "downloads_thumbnail_idx" ON "downloads" USING btree ("thumbnail_id");
    CREATE INDEX "downloads_download_file_idx" ON "downloads" USING btree ("download_file_id");
    CREATE INDEX "downloads_updated_at_idx" ON "downloads" USING btree ("updated_at");
    CREATE INDEX "downloads_created_at_idx" ON "downloads" USING btree ("created_at");
    CREATE INDEX "downloads__status_idx" ON "downloads" USING btree ("_status");
    CREATE INDEX "_downloads_v_version_tags_order_idx" ON "_downloads_v_version_tags" USING btree ("_order");
    CREATE INDEX "_downloads_v_version_tags_parent_id_idx" ON "_downloads_v_version_tags" USING btree ("_parent_id");
    CREATE INDEX "_downloads_v_parent_idx" ON "_downloads_v" USING btree ("parent_id");
    CREATE INDEX "_downloads_v_version_version_thumbnail_idx" ON "_downloads_v" USING btree ("version_thumbnail_id");
    CREATE INDEX "_downloads_v_version_version_download_file_idx" ON "_downloads_v" USING btree ("version_download_file_id");
    CREATE INDEX "_downloads_v_version_version_updated_at_idx" ON "_downloads_v" USING btree ("version_updated_at");
    CREATE INDEX "_downloads_v_version_version_created_at_idx" ON "_downloads_v" USING btree ("version_created_at");
    CREATE INDEX "_downloads_v_version_version__status_idx" ON "_downloads_v" USING btree ("version__status");
    CREATE INDEX "_downloads_v_created_at_idx" ON "_downloads_v" USING btree ("created_at");
    CREATE INDEX "_downloads_v_updated_at_idx" ON "_downloads_v" USING btree ("updated_at");
    CREATE INDEX "_downloads_v_latest_idx" ON "_downloads_v" USING btree ("latest");
    CREATE INDEX "_downloads_v_autosave_idx" ON "_downloads_v" USING btree ("autosave");
  `)

  // Indexes — tutorials
  await db.execute(sql`
    CREATE INDEX "tutorials_steps_order_idx" ON "tutorials_steps" USING btree ("_order");
    CREATE INDEX "tutorials_steps_parent_id_idx" ON "tutorials_steps" USING btree ("_parent_id");
    CREATE INDEX "tutorials_steps_step_image_idx" ON "tutorials_steps" USING btree ("step_image_id");
    CREATE INDEX "tutorials_hero_image_idx" ON "tutorials" USING btree ("hero_image_id");
    CREATE INDEX "tutorials_meta_meta_image_idx" ON "tutorials" USING btree ("meta_image_id");
    CREATE INDEX "tutorials_slug_idx" ON "tutorials" USING btree ("slug");
    CREATE INDEX "tutorials_updated_at_idx" ON "tutorials" USING btree ("updated_at");
    CREATE INDEX "tutorials_created_at_idx" ON "tutorials" USING btree ("created_at");
    CREATE INDEX "tutorials__status_idx" ON "tutorials" USING btree ("_status");
    CREATE INDEX "_tutorials_v_version_steps_order_idx" ON "_tutorials_v_version_steps" USING btree ("_order");
    CREATE INDEX "_tutorials_v_version_steps_parent_id_idx" ON "_tutorials_v_version_steps" USING btree ("_parent_id");
    CREATE INDEX "_tutorials_v_version_steps_step_image_idx" ON "_tutorials_v_version_steps" USING btree ("step_image_id");
    CREATE INDEX "_tutorials_v_parent_idx" ON "_tutorials_v" USING btree ("parent_id");
    CREATE INDEX "_tutorials_v_version_version_hero_image_idx" ON "_tutorials_v" USING btree ("version_hero_image_id");
    CREATE INDEX "_tutorials_v_version_meta_version_meta_image_idx" ON "_tutorials_v" USING btree ("version_meta_image_id");
    CREATE INDEX "_tutorials_v_version_version_slug_idx" ON "_tutorials_v" USING btree ("version_slug");
    CREATE INDEX "_tutorials_v_version_version_updated_at_idx" ON "_tutorials_v" USING btree ("version_updated_at");
    CREATE INDEX "_tutorials_v_version_version_created_at_idx" ON "_tutorials_v" USING btree ("version_created_at");
    CREATE INDEX "_tutorials_v_version_version__status_idx" ON "_tutorials_v" USING btree ("version__status");
    CREATE INDEX "_tutorials_v_created_at_idx" ON "_tutorials_v" USING btree ("created_at");
    CREATE INDEX "_tutorials_v_updated_at_idx" ON "_tutorials_v" USING btree ("updated_at");
    CREATE INDEX "_tutorials_v_latest_idx" ON "_tutorials_v" USING btree ("latest");
    CREATE INDEX "_tutorials_v_autosave_idx" ON "_tutorials_v" USING btree ("autosave");
  `)

  // Indexes — junction table columns
  await db.execute(sql`
    CREATE INDEX "pages_rels_articles_id_idx" ON "pages_rels" USING btree ("articles_id");
    CREATE INDEX "pages_rels_downloads_id_idx" ON "pages_rels" USING btree ("downloads_id");
    CREATE INDEX "pages_rels_tutorials_id_idx" ON "pages_rels" USING btree ("tutorials_id");
    CREATE INDEX "_pages_v_rels_articles_id_idx" ON "_pages_v_rels" USING btree ("articles_id");
    CREATE INDEX "_pages_v_rels_downloads_id_idx" ON "_pages_v_rels" USING btree ("downloads_id");
    CREATE INDEX "_pages_v_rels_tutorials_id_idx" ON "_pages_v_rels" USING btree ("tutorials_id");
    CREATE INDEX "payload_locked_documents_rels_articles_id_idx" ON "payload_locked_documents_rels" USING btree ("articles_id");
    CREATE INDEX "payload_locked_documents_rels_downloads_id_idx" ON "payload_locked_documents_rels" USING btree ("downloads_id");
    CREATE INDEX "payload_locked_documents_rels_tutorials_id_idx" ON "payload_locked_documents_rels" USING btree ("tutorials_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pages_blocks_article_grid" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "pages_blocks_download_grid" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "pages_blocks_tutorial_grid" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "_pages_v_blocks_article_grid" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "_pages_v_blocks_download_grid" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "_pages_v_blocks_tutorial_grid" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "articles" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "_articles_v" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "downloads_tags" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "downloads" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "_downloads_v_version_tags" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "_downloads_v" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "tutorials_steps" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "tutorials" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "_tutorials_v_version_steps" DISABLE ROW LEVEL SECURITY;
    ALTER TABLE "_tutorials_v" DISABLE ROW LEVEL SECURITY;
    DROP TABLE "pages_blocks_article_grid" CASCADE;
    DROP TABLE "pages_blocks_download_grid" CASCADE;
    DROP TABLE "pages_blocks_tutorial_grid" CASCADE;
    DROP TABLE "_pages_v_blocks_article_grid" CASCADE;
    DROP TABLE "_pages_v_blocks_download_grid" CASCADE;
    DROP TABLE "_pages_v_blocks_tutorial_grid" CASCADE;
    DROP TABLE "articles" CASCADE;
    DROP TABLE "_articles_v" CASCADE;
    DROP TABLE "downloads_tags" CASCADE;
    DROP TABLE "downloads" CASCADE;
    DROP TABLE "_downloads_v_version_tags" CASCADE;
    DROP TABLE "_downloads_v" CASCADE;
    DROP TABLE "tutorials_steps" CASCADE;
    DROP TABLE "tutorials" CASCADE;
    DROP TABLE "_tutorials_v_version_steps" CASCADE;
    DROP TABLE "_tutorials_v" CASCADE;
    ALTER TABLE "pages_rels" DROP CONSTRAINT "pages_rels_articles_fk";
    ALTER TABLE "pages_rels" DROP CONSTRAINT "pages_rels_downloads_fk";
    ALTER TABLE "pages_rels" DROP CONSTRAINT "pages_rels_tutorials_fk";
    ALTER TABLE "_pages_v_rels" DROP CONSTRAINT "_pages_v_rels_articles_fk";
    ALTER TABLE "_pages_v_rels" DROP CONSTRAINT "_pages_v_rels_downloads_fk";
    ALTER TABLE "_pages_v_rels" DROP CONSTRAINT "_pages_v_rels_tutorials_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_articles_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_downloads_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tutorials_fk";
    DROP INDEX "pages_rels_articles_id_idx";
    DROP INDEX "pages_rels_downloads_id_idx";
    DROP INDEX "pages_rels_tutorials_id_idx";
    DROP INDEX "_pages_v_rels_articles_id_idx";
    DROP INDEX "_pages_v_rels_downloads_id_idx";
    DROP INDEX "_pages_v_rels_tutorials_id_idx";
    DROP INDEX "payload_locked_documents_rels_articles_id_idx";
    DROP INDEX "payload_locked_documents_rels_downloads_id_idx";
    DROP INDEX "payload_locked_documents_rels_tutorials_id_idx";
    ALTER TABLE "pages_rels" DROP COLUMN "articles_id";
    ALTER TABLE "pages_rels" DROP COLUMN "downloads_id";
    ALTER TABLE "pages_rels" DROP COLUMN "tutorials_id";
    ALTER TABLE "_pages_v_rels" DROP COLUMN "articles_id";
    ALTER TABLE "_pages_v_rels" DROP COLUMN "downloads_id";
    ALTER TABLE "_pages_v_rels" DROP COLUMN "tutorials_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "articles_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "downloads_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "tutorials_id";
    DROP TYPE "public"."enum_pages_blocks_article_grid_background_color";
    DROP TYPE "public"."enum_pages_blocks_download_grid_background_color";
    DROP TYPE "public"."enum_pages_blocks_tutorial_grid_background_color";
    DROP TYPE "public"."enum__pages_v_blocks_article_grid_background_color";
    DROP TYPE "public"."enum__pages_v_blocks_download_grid_background_color";
    DROP TYPE "public"."enum__pages_v_blocks_tutorial_grid_background_color";
    DROP TYPE "public"."enum_articles_category";
    DROP TYPE "public"."enum_articles_status";
    DROP TYPE "public"."enum__articles_v_version_category";
    DROP TYPE "public"."enum__articles_v_version_status";
    DROP TYPE "public"."enum_downloads_file_type";
    DROP TYPE "public"."enum_downloads_status";
    DROP TYPE "public"."enum__downloads_v_version_file_type";
    DROP TYPE "public"."enum__downloads_v_version_status";
    DROP TYPE "public"."enum_tutorials_category";
    DROP TYPE "public"."enum_tutorials_difficulty";
    DROP TYPE "public"."enum_tutorials_status";
    DROP TYPE "public"."enum__tutorials_v_version_category";
    DROP TYPE "public"."enum__tutorials_v_version_difficulty";
    DROP TYPE "public"."enum__tutorials_v_version_status";
  `)
  // Note: ALTER TYPE ADD VALUE cannot be reversed in PostgreSQL.
  // The audio/document/unclassified values added to enum_media_media_type remain.
}
