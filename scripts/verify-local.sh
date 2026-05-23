#!/bin/bash
set -e

# Enterprise Standard: Local-CI Parity Script
# Purpose: Verifies migrations and seeding against a fresh, blank database.
# Usage: verify-local.sh [up] [--keep-open]
#        verify-local.sh down

SUBCOMMAND="${1:-up}"

# Handle 'down' subcommand (replaces cleanup-local.sh)
if [[ "$SUBCOMMAND" == "down" ]]; then
  CONTAINER_NAME="frh-verify-db"
  echo "--- Dismantling Local Verification Environment ---"
  if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Stopping and removing container: $CONTAINER_NAME..."
    docker stop "$CONTAINER_NAME" > /dev/null
    docker rm "$CONTAINER_NAME" > /dev/null
    echo "✅ Environment dismantled successfully."
  else
    echo "No verification environment found running."
  fi
  exit 0
fi

# 'up' path — shift past subcommand only if it was explicitly passed
if [[ "$SUBCOMMAND" == "up" && $# -gt 0 ]]; then
  shift
fi

KEEP_OPEN=false
for arg in "$@"; do
  if [ "$arg" == "--keep-open" ]; then
    KEEP_OPEN=true
  fi
done

# Load environment variables
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please create one based on .env.example."
    exit 1
fi

echo "--- Starting Local 'Blank-Slate' Verification ---"

CONTAINER_NAME="frh-verify-db"
POSTGRES_PASSWORD="password"
POSTGRES_DB="framehouse_test"
PORT=5433

cleanup() {
    if [ "$KEEP_OPEN" = false ]; then
        echo "4. Cleaning up temporary resources..."
        docker stop "$CONTAINER_NAME" > /dev/null 2>&1 || true
        docker rm "$CONTAINER_NAME" > /dev/null 2>&1 || true
    fi
}

if [ "$KEEP_OPEN" = false ]; then
    trap cleanup EXIT
fi

# Remove any stale container from a previous run
docker stop "$CONTAINER_NAME" > /dev/null 2>&1 || true
docker rm "$CONTAINER_NAME" > /dev/null 2>&1 || true

echo "1. Initializing temporary database container on port $PORT..."
if ! docker run --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  -e POSTGRES_DB=$POSTGRES_DB \
  -p $PORT:5432 \
  -d postgres:15-alpine > /dev/null 2>&1; then
    echo "Error: Failed to start Docker container. Is port $PORT already in use?"
    exit 1
fi

echo "   Waiting for database to initialize..."
MAX_RETRIES=30
COUNT=0
until docker exec "$CONTAINER_NAME" pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "Error: Database failed to start in time."
    exit 1
  fi
done

TEST_DATABASE_URI="postgres://postgres:$POSTGRES_PASSWORD@localhost:$PORT/$POSTGRES_DB"

echo "2. Running reset core (migrate + seed)..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/reset.sh" \
  --target local \
  --database-uri "$TEST_DATABASE_URI" \
  --skip-storage \
  --no-confirm

if [ "$KEEP_OPEN" = true ]; then
    echo "----------------------------------------------"
    echo "✅ Local Verification Successful (PERSISTENT)"
    echo "The database is kept running on port $PORT."
    echo ""
    echo "To test the frontend against this blank-slate data, run:"
    echo "DATABASE_URI=$TEST_DATABASE_URI pnpm run dev"
    echo ""
    echo "When finished, run './scripts/verify-local.sh down' to dismantle."
    echo "----------------------------------------------"
else
    echo "----------------------------------------------"
    echo "✅ Local Verification Successful"
    echo "The schema and seed logic are PR-Ready."
    echo "----------------------------------------------"
fi
