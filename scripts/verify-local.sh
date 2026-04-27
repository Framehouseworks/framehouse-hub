#!/bin/bash
set -e

# Enterprise Standard: Local-CI Parity Script
# Purpose: Verifies migrations and seeding against a fresh, blank database.

# Check for flags
KEEP_OPEN=false
for arg in "$@"; do
  if [ "$arg" == "--keep-open" ]; then
    KEEP_OPEN=true
  fi
done

# Load environment variables for basic Payload config (e.g., PAYLOAD_SECRET)
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please create one based on .env.example."
    exit 1
fi

echo "--- Starting Local 'Blank-Slate' Verification ---"

# 1. Configuration
CONTAINER_NAME="frh-verify-db"
POSTGRES_PASSWORD="password"
POSTGRES_DB="framehouse_test"
PORT=5433

# Cleanup any existing container from a failed previous run
docker stop "$CONTAINER_NAME" > /dev/null 2>&1 || true
docker rm "$CONTAINER_NAME" > /dev/null 2>&1 || true

# 2. Spin up a temporary Postgres container
echo "1. Initializing temporary database container on port $PORT..."
docker run --name "$CONTAINER_NAME" \
  -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  -e POSTGRES_DB=$POSTGRES_DB \
  -p $PORT:5432 \
  -d postgres:15-alpine > /dev/null

# Wait for postgres to be ready
echo "   Waiting for database to initialize..."
MAX_RETRIES=30
COUNT=0
until docker exec "$CONTAINER_NAME" pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "Error: Database failed to start in time."
    docker stop "$CONTAINER_NAME" > /dev/null
    docker rm "$CONTAINER_NAME" > /dev/null
    exit 1
  fi
done

# 3. Define Test Connection String
TEST_DATABASE_URI="postgres://postgres:$POSTGRES_PASSWORD@localhost:$PORT/$POSTGRES_DB"

# 4. Run Migrations
echo "2. Running remote-migration mirror..."
DATABASE_URI=$TEST_DATABASE_URI npm run payload migrate

# 5. Run Seed
echo "3. Running 'Day Zero' seeding test..."
DATABASE_URI=$TEST_DATABASE_URI npm run seed

# 6. Cleanup or Persist
if [ "$KEEP_OPEN" = true ]; then
    echo "----------------------------------------------"
    echo "✅ Local Verification Successful (PERSISTENT)"
    echo "The database is kept running on port $PORT."
    echo ""
    echo "To test the frontend against this blank-slate data, run:"
    echo "DATABASE_URI=$TEST_DATABASE_URI npm run dev"
    echo ""
    echo "When finished, run './scripts/cleanup-local.sh' to dismantle."
    echo "----------------------------------------------"
else
    echo "4. Cleaning up temporary resources..."
    docker stop "$CONTAINER_NAME" > /dev/null
    docker rm "$CONTAINER_NAME" > /dev/null
    echo "----------------------------------------------"
    echo "✅ Local Verification Successful"
    echo "The schema and seed logic are PR-Ready."
    echo "----------------------------------------------"
fi
