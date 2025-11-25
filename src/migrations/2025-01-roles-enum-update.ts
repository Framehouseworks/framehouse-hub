import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Migration: Add "viewer" and "creative" to the enum_users_roles enum
 * This resolves:
 *   invalid input value for enum enum_users_roles: "viewer"
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add values to enum (safe operation — Postgres only allows adding, not removing)
  await db.execute(
    sql`ALTER TYPE enum_users_roles ADD VALUE IF NOT EXISTS 'viewer'`
  )
  await db.execute(
    sql`ALTER TYPE enum_users_roles ADD VALUE IF NOT EXISTS 'creative'`
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // WARNING: Postgres does not support removing values from ENUMs.
  // To rollback, you would need to recreate the enum manually.
  // In this migration, the rollback is intentionally a no-op.

  console.warn(
    'Down migration skipped: Postgres cannot remove enum values "viewer" or "creative".'
  )
}
