#!/bin/bash

# --- GCS Transfer Objects Lifecycle Governance (FRH-67) ---
# Enforces a strict 3-day (72-hour) retention policy on temporary transfer files
# under the transfers/ prefix in Google Cloud Storage.
# Protects the 5GB GCP free-tier allowance by automatically purging stale transfers.
# Transfer objects are uploaded via direct XHR PUT (not multipart) — no multipart
# abort rule is needed.

set -e

BUCKET_NAME="${GCS_BUCKET:-framehouse-hub-dev}"

# Use mktemp so the script is safe to run from any working directory
POLICY_FILE="$(mktemp /tmp/gcs-transfers-lifecycle.XXXXXX.json)"
trap 'rm -f "$POLICY_FILE"' EXIT

echo "🏗️  Configuring GCS 3-day lifecycle policy on gs://${BUCKET_NAME}..."

cat <<EOF > "$POLICY_FILE"
{
  "rule": [
    {
      "action": {
        "type": "Delete"
      },
      "condition": {
        "age": 3,
        "matchesPrefix": ["transfers/"]
      }
    }
  ]
}
EOF

echo "📡 Applying lifecycle policy to gs://${BUCKET_NAME}..."
gcloud storage buckets update "gs://${BUCKET_NAME}" --lifecycle-file="$POLICY_FILE"

echo "✅ GCS Transfer lifecycle policy applied successfully (3-day auto-purge for transfers/*)."
echo "🔍 To verify, run: gcloud storage buckets describe gs://${BUCKET_NAME} --format='json(lifecycle)'"
