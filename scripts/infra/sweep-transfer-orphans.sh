#!/bin/bash

# --- GCS Transfer Zero-Byte Placeholder Orphan Sweep (FRH-68) ---
# Safely purges zero-byte directory placeholder objects under transfers/
# without touching active files or other storage namespaces.
#
# Usage:
#   DRY_RUN=true GCS_BUCKET=framehouse-hub-dev ./scripts/infra/sweep-transfer-orphans.sh
#   GCS_BUCKET=framehouse-hub-dev ./scripts/infra/sweep-transfer-orphans.sh

set -euo pipefail

BUCKET="${GCS_BUCKET:-framehouse-hub-dev}"
DRY_RUN="${DRY_RUN:-false}"

ORPHAN_LIST="$(mktemp /tmp/gcs-transfer-orphans.XXXXXX.txt)"
trap 'rm -f "$ORPHAN_LIST"' EXIT

echo "🔍 Scanning gs://${BUCKET}/transfers/ for zero-byte placeholder objects..."

# Discover objects strictly with size=0 and names ending in trailing slash
gcloud storage objects list "gs://${BUCKET}/transfers/**" \
  --filter="size=0 AND name ~ .*/$" \
  --format="value(name)" > "$ORPHAN_LIST" 2>/dev/null || true

# Strip any blank lines
sed -i '' '/^[[:space:]]*$/d' "$ORPHAN_LIST" 2>/dev/null || sed -i '/^[[:space:]]*$/d' "$ORPHAN_LIST" 2>/dev/null || true

COUNT=$(wc -l < "$ORPHAN_LIST" | tr -d ' ')
echo "Discovered ${COUNT} zero-byte placeholder objects."

if [ "$COUNT" -eq 0 ]; then
  echo "✅ No ghost folder placeholders detected on gs://${BUCKET}/transfers/."
  exit 0
fi

if [ "$DRY_RUN" = "true" ]; then
  echo "📋 [DRY-RUN] Candidate objects to delete:"
  cat "$ORPHAN_LIST"
  echo "DRY-RUN completed. No objects deleted."
  exit 0
fi

echo "🗑️  Purging ${COUNT} zero-byte placeholder objects..."
while IFS= read -r obj; do
  [ -n "$obj" ] || continue
  gcloud storage rm "gs://${BUCKET}/${obj}"
done < "$ORPHAN_LIST"

echo "✅ Orphan placeholder sweep completed successfully on gs://${BUCKET}."
