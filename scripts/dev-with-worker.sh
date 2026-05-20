#!/usr/bin/env bash
# Launches the Go ingestion worker on :8080 alongside `next dev`, so the local
# pipeline mirrors the cloud Eventarc trigger. Killing this script tears the
# worker down too.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="$ROOT_DIR/scripts/worker"
WORKER_BIN="$WORKER_DIR/worker"
WORKER_PORT="${LOCAL_WORKER_PORT:-8080}"

if ! command -v go >/dev/null 2>&1; then
  echo "[dev] go toolchain not found on PATH; skipping worker startup." >&2
  echo "[dev] Install Go or run the worker separately to enable async processing." >&2
else
  if [ ! -x "$WORKER_BIN" ] || [ "$WORKER_DIR/main.go" -nt "$WORKER_BIN" ]; then
    echo "[dev] Building Go worker..."
    (cd "$WORKER_DIR" && go build -o worker .)
  fi
fi

WORKER_PID=""
cleanup() {
  if [ -n "$WORKER_PID" ] && kill -0 "$WORKER_PID" 2>/dev/null; then
    echo "[dev] Stopping worker (pid $WORKER_PID)"
    kill "$WORKER_PID" 2>/dev/null || true
    wait "$WORKER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if [ -x "$WORKER_BIN" ]; then
  if lsof -ti:"$WORKER_PORT" >/dev/null 2>&1; then
    echo "[dev] Port $WORKER_PORT already in use; assuming worker is already running."
  else
    echo "[dev] Starting Go worker on :$WORKER_PORT..."
    # Pin LOCAL_MEDIA_ROOT so the worker never resolves derivative paths
    # relative to its cwd. Prevents files from escaping the project when
    # the worker is launched from somewhere other than scripts/worker/.
    PORT="$WORKER_PORT" LOCAL_MEDIA_ROOT="$ROOT_DIR/public/media" \
      "$WORKER_BIN" 2>&1 | sed 's/^/[worker] /' &
    WORKER_PID=$!
  fi
fi

echo "[dev] Starting Next dev server..."
NODE_OPTIONS=--no-deprecation pnpm exec next dev
