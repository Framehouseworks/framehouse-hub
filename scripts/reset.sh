#!/bin/bash
set -uo pipefail

# Reset Engine core — drop schema, empty bucket, migrate, seed.
# Callers: reset-engine.yml (cloud), verify-local.sh (local), direct CLI.
# Usage: reset.sh --target local|dev|prod [--database-uri URI] [--bucket NAME]
#                 [--skip-storage] [--skip-seed] [--no-confirm]

TARGET=""
DATABASE_URI_ARG=""
BUCKET_ARG=""
SKIP_STORAGE=false
SKIP_SEED=false
NO_CONFIRM=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --target)       TARGET="$2"; shift 2 ;;
    --database-uri) DATABASE_URI_ARG="$2"; shift 2 ;;
    --bucket)       BUCKET_ARG="$2"; shift 2 ;;
    --skip-storage) SKIP_STORAGE=true; shift ;;
    --skip-seed)    SKIP_SEED=true; shift ;;
    --no-confirm)   NO_CONFIRM=true; shift ;;
    *) echo "Error: unknown argument: $1"; exit 2 ;;
  esac
done

# --- Validate target ---
if [[ -z "$TARGET" ]]; then
  echo "Error: --target local|dev|prod is required"
  exit 2
fi
if [[ "$TARGET" != "local" && "$TARGET" != "dev" && "$TARGET" != "prod" ]]; then
  echo "Error: --target must be local, dev, or prod (got: $TARGET)"
  exit 2
fi

# --- Resolve DATABASE_URI ---
if [[ -n "$DATABASE_URI_ARG" ]]; then
  DB_URI="$DATABASE_URI_ARG"
elif [[ -n "${DATABASE_URI:-}" ]]; then
  DB_URI="$DATABASE_URI"
else
  echo "Error: DATABASE_URI not resolved. Pass --database-uri or set DATABASE_URI env."
  exit 2
fi

# Append sslmode for remote targets
if [[ "$TARGET" != "local" && "$DB_URI" != *"sslmode="* ]]; then
  DB_URI="${DB_URI}?sslmode=require"
fi

# --- Resolve bucket ---
if [[ "$TARGET" == "local" ]]; then
  SKIP_STORAGE=true
  BUCKET=""
elif [[ -n "$BUCKET_ARG" ]]; then
  BUCKET="$BUCKET_ARG"
elif [[ -n "${GCS_BUCKET:-}" ]]; then
  BUCKET="$GCS_BUCKET"
else
  BUCKET="framehouse-hub-${TARGET}"
fi

# --- Confirmation phrase guard ---
if [[ "$NO_CONFIRM" == "false" ]]; then
  EXPECTED="NUKE-${TARGET^^}"
  read -rp "Enter confirmation phrase (${EXPECTED}): " PHRASE
  if [[ "$PHRASE" != "$EXPECTED" ]]; then
    echo "Confirmation phrase mismatch. Aborting."
    exit 1
  fi
fi

echo ""
echo "--- Reset Engine: target=${TARGET} ---"

# Step 1: Drop and recreate schema
echo "1. Dropping database schema..."
psql "$DB_URI" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" \
  || { echo "Error: schema drop failed"; exit 3; }

# Step 2: Empty storage bucket
if [[ "$SKIP_STORAGE" == "false" && -n "$BUCKET" ]]; then
  echo "2. Emptying storage bucket gs://${BUCKET}..."
  gcloud storage rm --recursive "gs://${BUCKET}/**" --quiet || true
fi

# Step 3: Apply migrations
echo "3. Running migrations..."
DATABASE_URI="$DB_URI" pnpm run payload migrate \
  || { echo "Error: migrate failed"; exit 3; }

# Step 4: Seed
if [[ "$SKIP_SEED" == "false" ]]; then
  echo "4. Running seed..."
  DATABASE_URI="$DB_URI" pnpm run seed \
    || { echo "Error: seed failed"; exit 3; }
fi

echo "----------------------------------------------"
echo "✅ Reset complete (target=${TARGET})"
echo "----------------------------------------------"
