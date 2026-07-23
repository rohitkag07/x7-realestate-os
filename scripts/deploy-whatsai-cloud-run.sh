#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-whatsai-assistant-prod}"
BILLING_ACCOUNT_ID="${GCP_BILLING_ACCOUNT_ID:-016AC5-C35EAA-3B5B70}"
REGION="${GCP_REGION:-asia-south1}"
MIN_INSTANCES="${CLOUD_RUN_MIN_INSTANCES:-1}"
MAX_INSTANCES="${CLOUD_RUN_MAX_INSTANCES:-10}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_SERVICE_ACCOUNT="whatsai-runtime"
RUNTIME_SERVICE_ACCOUNT_EMAIL="${RUNTIME_SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"
VERCEL_PRODUCTION_URL="${VERCEL_PRODUCTION_URL:-x7-whatsai-dashboard.vercel.app}"

TOOL_ENV_FILE="$ROOT/agents/x7-re-tool-gateway/.env"
SALES_ENV_FILE="$ROOT/agents/x7-re-sales-agent/.env"
SUMMONER_ENV_FILE="$ROOT/agents/x7-re-summoner/.env"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Missing required command: %s\n' "$1" >&2
    exit 1
  }
}

read_env_value() {
  local file="$1"
  local key="$2"

  node - "$file" "$key" <<'NODE'
const fs = require('node:fs');
const [file, key] = process.argv.slice(2);
if (!fs.existsSync(file)) process.exit(2);
const line = fs.readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .find((entry) => entry && !entry.trimStart().startsWith('#') && entry.slice(0, entry.indexOf('=')).trim() === key);
if (!line) process.exit(3);
let value = line.slice(line.indexOf('=') + 1).trim();
if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
  value = value.slice(1, -1);
}
process.stdout.write(value);
NODE
}

required_env_value() {
  local file="$1"
  local key="$2"
  local value

  value="$(read_env_value "$file" "$key" 2>/dev/null || true)"
  if [[ -z "$value" ]]; then
    printf 'Required value %s is missing from %s\n' "$key" "$file" >&2
    exit 1
  fi
  printf '%s' "$value"
}

sync_secret() {
  local secret_name="$1"
  local value="$2"

  if ! gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$secret_name" \
      --project="$PROJECT_ID" \
      --replication-policy=automatic \
      --quiet >/dev/null
  fi

  printf '%s' "$value" | gcloud secrets versions add "$secret_name" \
    --project="$PROJECT_ID" \
    --data-file=- \
    --quiet >/dev/null
  printf 'Updated Secret Manager value: %s\n' "$secret_name"
}

candidate_url() {
  local service="$1"
  gcloud run services describe "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --platform=managed \
    --format=json |
    node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{const j=JSON.parse(s);const t=(j.status?.traffic||[]).find(x=>x.tag==='candidate');if(!t?.url)process.exit(1);process.stdout.write(t.url)})"
}

wait_for_health() {
  local service="$1"
  local url="$2"
  local attempt

  for attempt in $(seq 1 30); do
    if payload="$(curl --silent --show-error --fail --max-time 10 "$url/health" 2>/dev/null)"; then
      HEALTH_PAYLOAD="$payload" node - "$service" <<'NODE'
const service = process.argv[2];
const health = JSON.parse(process.env.HEALTH_PAYLOAD || '{}');
const configured = health.ok === true
  && health.supabase === true
  && health.whatsapp?.configured === true;
if (!configured) {
  console.error(`${service} health is reachable but dependencies are not configured.`);
  process.exit(1);
}
NODE
      printf 'Candidate healthy: %s\n' "$service" >&2
      return 0
    fi
    sleep 2
  done

  printf 'Candidate health check failed: %s\n' "$service" >&2
  return 1
}

deploy_candidate() {
  local service="$1"
  local source_dir="$2"
  local port="$3"
  local env_vars="$4"
  local secrets="$5"
  local url

  gcloud run deploy "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --platform=managed \
    --source="$source_dir" \
    --service-account="$RUNTIME_SERVICE_ACCOUNT_EMAIL" \
    --allow-unauthenticated \
    --ingress=all \
    --port="$port" \
    --cpu=1 \
    --memory=512Mi \
    --concurrency=80 \
    --timeout=60 \
    --min-instances="$MIN_INSTANCES" \
    --max-instances="$MAX_INSTANCES" \
    --no-cpu-throttling \
    --startup-cpu-boost \
    --execution-environment=gen2 \
    --set-env-vars="$env_vars" \
    --set-secrets="$secrets" \
    --tag=candidate \
    --no-traffic \
    --quiet 1>&2

  url="$(candidate_url "$service")"
  wait_for_health "$service" "$url"

  gcloud run services update-traffic "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --platform=managed \
    --to-latest \
    --quiet >/dev/null

  gcloud run services describe "$service" \
    --project="$PROJECT_ID" \
    --region="$REGION" \
    --platform=managed \
    --format='value(status.url)'
}

set_vercel_env() {
  local name="$1"
  local value="$2"
  printf '%s' "$value" | vercel env add "$name" production --force --yes >/dev/null
  printf 'Updated Vercel production variable: %s\n' "$name"
}

require_command gcloud
require_command node
require_command curl

if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q .; then
  printf 'No active gcloud account. Run: gcloud auth login\n' >&2
  exit 1
fi

if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud projects create "$PROJECT_ID" --name='WhatsAI Production'
fi

gcloud billing projects link "$PROJECT_ID" \
  --billing-account="$BILLING_ACCOUNT_ID" \
  --quiet >/dev/null

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud config set run/region "$REGION" >/dev/null

BILLING_ENABLED="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)')"
if [[ "$BILLING_ENABLED" != "True" && "$BILLING_ENABLED" != "true" ]]; then
  printf '\nBilling is linked but not open for project %s.\n' "$PROJECT_ID" >&2
  printf 'Open: https://console.cloud.google.com/billing/linkedaccount?project=%s\n' "$PROJECT_ID" >&2
  printf 'Select an OPEN billing account, then rerun this script.\n' >&2
  exit 2
fi

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  --project="$PROJECT_ID"

if ! gcloud iam service-accounts describe "$RUNTIME_SERVICE_ACCOUNT_EMAIL" \
  --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_SERVICE_ACCOUNT" \
    --project="$PROJECT_ID" \
    --display-name='WhatsAI Cloud Run Runtime'
fi

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$RUNTIME_SERVICE_ACCOUNT_EMAIL" \
  --role='roles/secretmanager.secretAccessor' \
  --condition=None \
  --quiet >/dev/null

AGENT_SECRET="$(required_env_value "$TOOL_ENV_FILE" AGENT_SECRET)"
SUPABASE_URL="$(required_env_value "$SALES_ENV_FILE" SUPABASE_URL)"
SUPABASE_SERVICE_ROLE_KEY="$(required_env_value "$SALES_ENV_FILE" SUPABASE_SERVICE_ROLE_KEY)"
WHATSAPP_ACCESS_TOKEN="$(required_env_value "$TOOL_ENV_FILE" WHATSAPP_ACCESS_TOKEN)"
WHATSAPP_PHONE_NUMBER_ID="$(required_env_value "$TOOL_ENV_FILE" WHATSAPP_PHONE_NUMBER_ID)"
WHATSAPP_VERIFY_TOKEN="$(required_env_value "$SUMMONER_ENV_FILE" WHATSAPP_VERIFY_TOKEN)"
META_APP_SECRET="$(required_env_value "$SUMMONER_ENV_FILE" META_APP_SECRET)"
DEFAULT_BUSINESS_ID="$(required_env_value "$SUMMONER_ENV_FILE" DEFAULT_BUSINESS_ID)"
DEFAULT_BUILDER_ID="$(required_env_value "$SUMMONER_ENV_FILE" DEFAULT_BUILDER_ID)"
DEFAULT_PROJECT_ID="$(required_env_value "$SUMMONER_ENV_FILE" DEFAULT_PROJECT_ID)"
WHATSAPP_GRAPH_VERSION="$(read_env_value "$SUMMONER_ENV_FILE" WHATSAPP_GRAPH_VERSION 2>/dev/null || printf 'v22.0')"

sync_secret whatsai-agent-secret "$AGENT_SECRET"
sync_secret whatsai-supabase-service-role-key "$SUPABASE_SERVICE_ROLE_KEY"
sync_secret whatsai-whatsapp-access-token "$WHATSAPP_ACCESS_TOKEN"
sync_secret whatsai-whatsapp-verify-token "$WHATSAPP_VERIFY_TOKEN"
sync_secret whatsai-meta-app-secret "$META_APP_SECRET"

COMMON_SECRETS='AGENT_SECRET=whatsai-agent-secret:latest,SUPABASE_SERVICE_ROLE_KEY=whatsai-supabase-service-role-key:latest,WHATSAPP_ACCESS_TOKEN=whatsai-whatsapp-access-token:latest'

TOOL_GATEWAY_URL="$(deploy_candidate \
  whatsai-tool-gateway \
  "$ROOT/agents/x7-re-tool-gateway" \
  8081 \
  "NODE_ENV=production,SUPABASE_URL=$SUPABASE_URL,WHATSAPP_PHONE_NUMBER_ID=$WHATSAPP_PHONE_NUMBER_ID,WHATSAPP_GRAPH_VERSION=$WHATSAPP_GRAPH_VERSION" \
  "$COMMON_SECRETS")"

SALES_AGENT_URL="$(deploy_candidate \
  whatsai-sales-agent \
  "$ROOT/agents/x7-re-sales-agent" \
  8080 \
  "NODE_ENV=production,SUPABASE_URL=$SUPABASE_URL,WHATSAPP_PHONE_NUMBER_ID=$WHATSAPP_PHONE_NUMBER_ID,WHATSAPP_GRAPH_VERSION=$WHATSAPP_GRAPH_VERSION,DEFAULT_BUSINESS_ID=$DEFAULT_BUSINESS_ID,DEFAULT_BUILDER_ID=$DEFAULT_BUILDER_ID,DEFAULT_PROJECT_ID=$DEFAULT_PROJECT_ID,TOOL_GATEWAY_URL=$TOOL_GATEWAY_URL,DYNAMIC_KEYWORD_ENGINE_ENABLED=true,KNOWLEDGE_BASE_ENABLED=true" \
  "$COMMON_SECRETS,WHATSAPP_VERIFY_TOKEN=whatsai-whatsapp-verify-token:latest,META_APP_SECRET=whatsai-meta-app-secret:latest")"

SUMMONER_URL="$(deploy_candidate \
  whatsai-summoner \
  "$ROOT/agents/x7-re-summoner" \
  8082 \
  "NODE_ENV=production,SUPABASE_URL=$SUPABASE_URL,WHATSAPP_PHONE_NUMBER_ID=$WHATSAPP_PHONE_NUMBER_ID,WHATSAPP_GRAPH_VERSION=$WHATSAPP_GRAPH_VERSION,DEFAULT_BUSINESS_ID=$DEFAULT_BUSINESS_ID,DEFAULT_BUILDER_ID=$DEFAULT_BUILDER_ID,DEFAULT_PROJECT_ID=$DEFAULT_PROJECT_ID,SALES_AGENT_URL=$SALES_AGENT_URL,TOOL_GATEWAY_URL=$TOOL_GATEWAY_URL" \
  "$COMMON_SECRETS,WHATSAPP_VERIFY_TOKEN=whatsai-whatsapp-verify-token:latest,META_APP_SECRET=whatsai-meta-app-secret:latest")"

VERIFY_RESPONSE="$(curl --silent --show-error --fail --get \
  --data-urlencode 'hub.mode=subscribe' \
  --data-urlencode "hub.verify_token=$WHATSAPP_VERIFY_TOKEN" \
  --data-urlencode 'hub.challenge=cloudrun-ready' \
  "$SUMMONER_URL/webhooks/whatsapp")"
if [[ "$VERIFY_RESPONSE" != 'cloudrun-ready' ]]; then
  printf 'Summoner webhook verification returned an unexpected response.\n' >&2
  exit 1
fi

if command -v vercel >/dev/null 2>&1 && [[ -f "$ROOT/.vercel/project.json" ]]; then
  (
    cd "$ROOT"
    set_vercel_env SUMMONER_URL "$SUMMONER_URL"
    set_vercel_env SALES_AGENT_URL "$SALES_AGENT_URL"
    set_vercel_env TOOL_GATEWAY_URL "$TOOL_GATEWAY_URL"
    vercel redeploy "$VERCEL_PRODUCTION_URL" --target production
  )
else
  printf 'Vercel CLI/project link missing; update dashboard URLs manually.\n'
fi

printf '\nCloud Run deployment complete.\n'
printf 'Tool Gateway: %s\n' "$TOOL_GATEWAY_URL"
printf 'Sales Agent:  %s\n' "$SALES_AGENT_URL"
printf 'Summoner:     %s\n' "$SUMMONER_URL"
printf 'Meta callback: %s/webhooks/whatsapp\n' "$SUMMONER_URL"
