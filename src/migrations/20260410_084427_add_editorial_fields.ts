import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_content_background_color" AS ENUM('white', 'surface_low');
  CREATE TYPE "public"."enum_pages_blocks_content_layout_style" AS ENUM('default', 'asymmetric');
  CREATE TYPE "public"."enum_pages_blocks_carousel_style" AS ENUM('default', 'logoWall');
  CREATE TYPE "public"."enum_pages_blocks_three_item_grid_background_color" AS ENUM('white', 'surface_low');
  CREATE TYPE "public"."enum__pages_v_blocks_content_background_color" AS ENUM('white', 'surface_low');
  CREATE TYPE "public"."enum__pages_v_blocks_content_layout_style" AS ENUM('default', 'asymmetric');
  CREATE TYPE "public"."enum__pages_v_blocks_carousel_style" AS ENUM('default', 'logoWall');
  CREATE TYPE "public"."enum__pages_v_blocks_three_item_grid_background_color" AS ENUM('white', 'surface_low');
  ALTER TABLE "pages_blocks_content" ADD COLUMN "background_color" "enum_pages_blocks_content_background_color" DEFAULT 'white';
  ALTER TABLE "pages_blocks_content" ADD COLUMN "layout_style" "enum_pages_blocks_content_layout_style" DEFAULT 'default';
  ALTER TABLE "pages_blocks_carousel" ADD COLUMN "style" "enum_pages_blocks_carousel_style" DEFAULT 'default';
  ALTER TABLE "pages_blocks_three_item_grid" ADD COLUMN "background_color" "enum_pages_blocks_three_item_grid_background_color" DEFAULT 'white';
  ALTER TABLE "_pages_v_blocks_content" ADD COLUMN "background_color" "enum__pages_v_blocks_content_background_color" DEFAULT 'white';
  ALTER TABLE "_pages_v_blocks_content" ADD COLUMN "layout_style" "enum__pages_v_blocks_content_layout_style" DEFAULT 'default';
  ALTER TABLE "_pages_v_blocks_carousel" ADD COLUMN "style" "enum__pages_v_blocks_carousel_style" DEFAULT 'default';
  ALTER TABLE "_pages_v_blocks_three_item_grid" ADD COLUMN "background_color" "enum__pages_v_blocks_three_item_grid_background_color" DEFAULT 'white';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_content" DROP COLUMN "background_color";
  ALTER TABLE "pages_blocks_content" DROP COLUMN "layout_style";
  ALTER TABLE "pages_blocks_carousel" DROP COLUMN "style";
  ALTER TABLE "pages_blocks_three_item_grid" DROP COLUMN "background_color";
  ALTER TABLE "_pages_v_blocks_content" DROP COLUMN "background_color";
  ALTER TABLE "_pages_v_blocks_content" DROP COLUMN "layout_style";
  ALTER TABLE "_pages_v_blocks_carousel" DROP COLUMN "style";
  ALTER TABLE "_pages_v_blocks_three_item_grid" DROP COLUMN "background_color";
  DROP TYPE "public"."enum_pages_blocks_content_background_color";
  DROP TYPE "public"."enum_pages_blocks_content_layout_style";
  DROP TYPE "public"."enum_pages_blocks_carousel_style";
  DROP TYPE "public"."enum_pages_blocks_three_item_grid_background_color";
  DROP TYPE "public"."enum__pages_v_blocks_content_background_color";
  DROP TYPE "public"."enum__pages_v_blocks_content_layout_style";
  DROP TYPE "public"."enum__pages_v_blocks_carousel_style";
  DROP TYPE "public"."enum__pages_v_blocks_three_item_grid_background_color";`)
}
