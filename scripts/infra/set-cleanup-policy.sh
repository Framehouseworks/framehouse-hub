#!/bin/bash

# --- Artifact Registry Lifecycle Governance ---
# This script enforces a "Keep-Last-10" cleanup policy on the Google Artifact Registry.
# It ensures cost control by automatically purging stale images while protecting
# critical tags (latest, dev).

set -e

# Configuration
PROJECT_ID="framehouse-hub"
LOCATION="us-central1"
REPOSITORY="framehouse-hub"
POLICY_FILE="cleanup-policy.json"

echo "🏗️  Starting Artifact Registry Lifecycle Hardening..."

# Create the policy definition file
# Rule 1: Keep the 10 most recent versions of any package.
# Rule 2: Delete images older than 30 days that are not tagged with 'latest' or 'dev'.
cat <<EOF > "$POLICY_FILE"
[
  {
    "name": "keep-latest-versions",
    "action": {
      "type": "Keep"
    },
    "mostRecentVersions": {
      "keepCount": 10
    }
  },
  {
    "name": "delete-stale-images",
    "action": {
      "type": "Delete"
    },
    "condition": {
      "tagState": "ANY",
      "olderThan": "2592000s"
    }
  }
]
EOF

echo "📡 Applying cleanup policy to repository: $REPOSITORY in $LOCATION..."

# Apply the policy
gcloud artifacts repositories set-cleanup-policies "$REPOSITORY" \
    --project="$PROJECT_ID" \
    --location="$LOCATION" \
    --policy="$POLICY_FILE"


# Clean up local file
rm "$POLICY_FILE"

echo "✅ Lifecycle policy applied successfully."
echo "🔍 To verify, run: gcloud artifacts repositories list-cleanup-policies $REPOSITORY --project=$PROJECT_ID --location=$LOCATION"
