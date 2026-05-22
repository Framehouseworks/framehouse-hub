#!/usr/bin/env bash
# Launches the Go ingestion worker on :8080 alongside `next dev`, so the local
# pipeline mirrors the cloud Eventarc trigger. Killing this script tears the
# worker down too.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="$ROOT_DIR/scripts/worker"
WORKER_BIN="$WORKER_DIR/worker"
WORKER_PORT="${LOCAL_WORKER_PORT:-8080}"

# CI and other constrained environments can disable the worker entirely.
# When DISABLE_WORKER=1 the Next dev server starts solo; integration tests
# fire process-callback directly to simulate the worker's "ready" state.
if [ "${DISABLE_WORKER:-}" = "1" ]; then
  echo "[dev] DISABLE_WORKER=1 — skipping Go worker startup."
  echo "[dev] Starting Next dev server..."
  exec env NODE_OPTIONS=--no-deprecation pnpm exec next dev
fi

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
NEXT_PID=""
cleanup() {
  if [ -n "$NEXT_PID" ] && kill -0 "$NEXT_PID" 2>/dev/null; then
    kill "$NEXT_PID" 2>/dev/null || true
  fi
  if [ -n "$WORKER_PID" ] && kill -0 "$WORKER_PID" 2>/dev/null; then
    echo "[dev] Stopping worker (pid $WORKER_PID)"
    kill "$WORKER_PID" 2>/dev/null || true
    wait "$WORKER_PID" 2>/dev/null || true
  fi
  # Fallback: free the port even if PID tracking lost the process
  local stale
  stale=$(lsof -ti:"$WORKER_PORT" 2>/dev/null) || true
  [ -n "$stale" ] && kill -9 $stale 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if [ -x "$WORKER_BIN" ]; then
  if lsof -ti:"$WORKER_PORT" >/dev/null 2>&1; then
    echo "[dev] Port $WORKER_PORT already in use; assuming worker is already running."
  else
    echo "[dev] Starting Go worker on :$WORKER_PORT..."
    PORT="$WORKER_PORT" LOCAL_MEDIA_ROOT="$ROOT_DIR/public/media" \
      "$WORKER_BIN" 2>&1 | sed 's/^/[worker] /' &
    WORKER_PID=$!
  fi
fi

echo "[dev] Starting Next dev server..."
# Background next dev so bash's wait builtin remains signal-interruptible.
# A foreground process blocks the EXIT/INT/TERM trap until it exits — which
# next dev never does cleanly — leaving the Go worker orphaned on :8080.
NODE_OPTIONS=--no-deprecation pnpm exec next dev &
NEXT_PID=$!
wait $NEXT_PID || true
