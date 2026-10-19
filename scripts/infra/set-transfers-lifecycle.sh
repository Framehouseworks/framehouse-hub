#!/bin/bash

# --- GCS Transfer Objects Lifecycle Governance (FRH-68) ---
# Enforces a strict 4-day retention policy on temporary transfer files
# under the transfers/ prefix in Google Cloud Storage (72h active + 24h buffer).
# Protects the 5GB GCP free-tier allowance by automatically purging stale transfers.
# Safely preserves pre-existing non-transfers lifecycle rules on the target bucket.

set -euo pipefail

BUCKET_NAME="${GCS_BUCKET:-framehouse-hub-dev}"

EXISTING_RULES="$(mktemp /tmp/gcs-existing-lifecycle.XXXXXX.json)"
POLICY_FILE="$(mktemp /tmp/gcs-transfers-lifecycle.XXXXXX.json)"
trap 'rm -f "$EXISTING_RULES" "$POLICY_FILE"' EXIT

echo "🏗️  Fetching existing lifecycle configuration on gs://${BUCKET_NAME}..."
gcloud storage buckets describe "gs://${BUCKET_NAME}" --format='json(lifecycle_config.rule)' > "$EXISTING_RULES"

# Merge existing rules (excluding existing transfers/ rule if present to be idempotent)
if [ -s "$EXISTING_RULES" ] && [ "$(cat "$EXISTING_RULES")" != "null" ] && command -v jq >/dev/null 2>&1; then
  jq '{
    rule: (
      ([.lifecycle_config.rule[]? | select(.condition.matchesPrefix != ["transfers/"])] // []) +
      [{
        action: { type: "Delete" },
        condition: {
          age: 4,
          matchesPrefix: ["transfers/"]
        }
      }]
    )
  }' "$EXISTING_RULES" > "$POLICY_FILE"
else
  cat <<EOF > "$POLICY_FILE"
{
  "rule": [
    {
      "action": {
        "type": "Delete"
      },
      "condition": {
        "age": 4,
        "matchesPrefix": ["transfers/"]
      }
    }
  ]
}
EOF
fi

echo "📡 Applying lifecycle policy to gs://${BUCKET_NAME}..."
gcloud storage buckets update "gs://${BUCKET_NAME}" --lifecycle-file="$POLICY_FILE"

echo "✅ GCS Transfer lifecycle policy applied successfully (age: 4 auto-purge for transfers/*)."
echo "🔍 Current policy on gs://${BUCKET_NAME}:"
gcloud storage buckets describe "gs://${BUCKET_NAME}" --format='json(lifecycle_config)'
