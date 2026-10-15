#!/bin/bash

# --- GCS Transfer Objects Lifecycle Governance (FRH-67) ---
# Enforces a strict 3-day (72-hour) retention policy on temporary transfer files
# under the transfers/ prefix in Google Cloud Storage.
# Protects the 5GB GCP free-tier allowance by automatically purging stale transfers.

set -e

BUCKET_NAME="${GCS_BUCKET:-framehouse-hub-dev}"
POLICY_FILE="gcs-transfers-lifecycle.json"

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
    },
    {
      "action": {
        "type": "AbortIncompleteMultipartUpload"
      },
      "condition": {
        "age": 1
      }
    }
  ]
}
EOF

echo "📡 Applying lifecycle policy to gs://${BUCKET_NAME}..."
gcloud storage buckets update "gs://${BUCKET_NAME}" --lifecycle-file="$POLICY_FILE"

rm -f "$POLICY_FILE"

echo "✅ GCS Transfer lifecycle policy applied successfully (3-day auto-purge for transfers/*)."
echo "🔍 To verify, run: gcloud storage buckets describe gs://${BUCKET_NAME} --format='json(lifecycle)'"
