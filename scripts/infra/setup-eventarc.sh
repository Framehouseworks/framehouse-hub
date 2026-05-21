#!/bin/bash

# --- Eventarc → Worker Trigger Provisioning ---
# Wires GCS object-finalized events on a tenant bucket into the worker's
# Cloud Run service. Idempotent: re-running is a no-op if the trigger
# already exists with the same destination. Mirrors the style of
# set-cleanup-policy.sh — kept in-repo so the binding is reproducible
# rather than depending on console clicks.
#
# Usage:
#   ./scripts/infra/setup-eventarc.sh --bucket BUCKET --service SERVICE [--region REGION] [--project PROJECT] [--trigger NAME] [--service-account SA]
#
# Defaults match the dev environment.

set -euo pipefail

# Defaults
PROJECT_ID="framehouse-hub"
REGION="us-central1"
BUCKET=""
SERVICE=""
TRIGGER_NAME=""
INVOKER_SA=""

usage() {
  cat <<'EOF'
Required:
  --bucket BUCKET          GCS bucket that emits the events (e.g. framehouse-hub-dev)
  --service SERVICE        Cloud Run worker service name (e.g. framehouse-hub-worker-dev)

Optional:
  --region REGION          Defaults to us-central1
  --project PROJECT        Defaults to framehouse-hub
  --trigger NAME           Defaults to <service>-finalize
  --service-account SA     SA Eventarc invokes the worker as. Defaults to
                           the worker service's own runtime SA.

Examples:
  ./scripts/infra/setup-eventarc.sh \
      --bucket framehouse-hub-dev --service framehouse-hub-worker-dev
EOF
}

while [ $# -gt 0 ]; do
  case "$1" in
    --bucket)          BUCKET="$2"; shift 2;;
    --service)         SERVICE="$2"; shift 2;;
    --region)          REGION="$2"; shift 2;;
    --project)         PROJECT_ID="$2"; shift 2;;
    --trigger)         TRIGGER_NAME="$2"; shift 2;;
    --service-account) INVOKER_SA="$2"; shift 2;;
    -h|--help)         usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2;;
  esac
done

if [ -z "$BUCKET" ] || [ -z "$SERVICE" ]; then
  echo "Error: --bucket and --service are required." >&2
  usage
  exit 2
fi

TRIGGER_NAME="${TRIGGER_NAME:-${SERVICE}-finalize}"

echo "🏗️  Provisioning Eventarc trigger..."
echo "   project : $PROJECT_ID"
echo "   region  : $REGION"
echo "   trigger : $TRIGGER_NAME"
echo "   bucket  : gs://$BUCKET"
echo "   service : $SERVICE"

# Resolve invoker SA. Cloud Run's runtime SA is the default invoker so the
# worker invokes itself with its own identity — keeps IAM surface tight.
if [ -z "$INVOKER_SA" ]; then
  INVOKER_SA="$(gcloud run services describe "$SERVICE" \
    --project="$PROJECT_ID" --region="$REGION" \
    --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null || true)"
  if [ -z "$INVOKER_SA" ]; then
    PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
    INVOKER_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
    echo "   note    : worker has no custom SA — falling back to compute SA ($INVOKER_SA)"
  fi
fi
echo "   invoker : $INVOKER_SA"

# Cloud Storage requires its service agent to have pubsub.publisher before
# Eventarc will let us bind a GCS trigger. Idempotent.
GCS_SA="$(gcloud storage service-agent --project="$PROJECT_ID")"
echo "📡 Ensuring GCS service agent ($GCS_SA) has pubsub.publisher..."
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${GCS_SA}" \
  --role="roles/pubsub.publisher" \
  --condition=None >/dev/null

# The invoker SA must hold roles/run.invoker on the worker service so
# Eventarc can deliver events. Bound at service scope, not project, to
# stay least-privilege.
echo "🔑 Granting run.invoker on $SERVICE to $INVOKER_SA..."
gcloud run services add-iam-policy-binding "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --member="serviceAccount:${INVOKER_SA}" \
  --role="roles/run.invoker" >/dev/null

# Detect existing trigger; create or update accordingly.
EXISTING="$(gcloud eventarc triggers describe "$TRIGGER_NAME" \
  --project="$PROJECT_ID" --location="$REGION" \
  --format='value(name)' 2>/dev/null || true)"

if [ -n "$EXISTING" ]; then
  echo "🔁 Trigger $TRIGGER_NAME already exists — skipping create."
  echo "   To recreate from scratch, run:"
  echo "   gcloud eventarc triggers delete $TRIGGER_NAME --location=$REGION --project=$PROJECT_ID"
  echo "   then re-run this script."
else
  echo "✨ Creating trigger $TRIGGER_NAME..."
  gcloud eventarc triggers create "$TRIGGER_NAME" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --destination-run-service="$SERVICE" \
    --destination-run-region="$REGION" \
    --event-filters="type=google.cloud.storage.object.v1.finalized" \
    --event-filters="bucket=$BUCKET" \
    --service-account="$INVOKER_SA"
fi

echo "✅ Done."
echo "🔍 Verify with:"
echo "   gcloud eventarc triggers describe $TRIGGER_NAME --location=$REGION --project=$PROJECT_ID"
