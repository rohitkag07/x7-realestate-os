#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

red() { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
yellow() { printf '\033[33m%s\033[0m\n' "$1"; }

check_http() {
  local label="$1"
  local url="$2"
  local code
  code="$(curl --max-time 5 -s -o /dev/null -w '%{http_code}' "$url" || true)"

  if [[ "$code" == "200" ]]; then
    green "ok      $label  $url"
  else
    red "failed  $label  $url  (http $code)"
  fi
}

check_file() {
  local label="$1"
  local path="$2"
  if [[ -e "$path" ]]; then
    green "ok      $label  $path"
  else
    red "failed  $label  $path"
  fi
}

print_section() {
  printf "\n== %s ==\n" "$1"
}

print_section "Git And Deploy Wiring"
check_file "git-root" "$ROOT_DIR/.git"
check_file "vercel-link" "$ROOT_DIR/.vercel/project.json"

if git -C "$ROOT_DIR" remote get-url origin >/dev/null 2>&1; then
  green "ok      git-origin  $(git -C "$ROOT_DIR" remote get-url origin)"
else
  red "failed  git-origin  remote origin not configured"
fi

print_section "Env Presence"
"$ROOT_DIR/scripts/check-foundation-env.sh"

print_section "Local Health"
check_http "sales-agent" "http://127.0.0.1:8080/health"
check_http "tool-gateway" "http://127.0.0.1:8081/health"
check_http "summoner" "http://127.0.0.1:8082/health"
check_http "summoner-deps" "http://127.0.0.1:8082/health/dependencies"
check_http "content-agent" "http://127.0.0.1:8083/health"
check_http "ads-agent" "http://127.0.0.1:8085/health"
check_http "ghost-closer" "http://127.0.0.1:8086/health"
check_http "colony-agent" "http://127.0.0.1:8087/health"
check_http "colony-deps" "http://127.0.0.1:8087/health/dependencies"
check_http "finance-agent" "http://127.0.0.1:8088/health"
check_http "finance-deps" "http://127.0.0.1:8088/health/dependencies"
check_http "dashboard-ping" "http://127.0.0.1:3000/api/ping"
check_http "dashboard-mesh" "http://127.0.0.1:3000/api/agent-mesh/health"
check_http "dashboard-readiness" "http://127.0.0.1:3000/api/ops/readiness"

print_section "WhatsApp Graph Check"
SALES_ENV="$ROOT_DIR/agents/x7-re-sales-agent/.env"
if [[ -f "$SALES_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$SALES_ENV"
  set +a

  if [[ -n "${WHATSAPP_PHONE_NUMBER_ID:-}" && -n "${WHATSAPP_ACCESS_TOKEN:-}" ]]; then
    payload="$(
      curl --max-time 10 -sS \
        "https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION:-v22.0}/${WHATSAPP_PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,code_verification_status&access_token=${WHATSAPP_ACCESS_TOKEN}" \
        || true
    )"

    if printf '%s' "$payload" | grep -q '"error"'; then
      red "failed  whatsapp-graph  $payload"
    else
      green "ok      whatsapp-graph  $payload"
    fi
  else
    yellow "warn    whatsapp-graph  missing token or phone number id in sales agent env"
  fi
else
  red "failed  whatsapp-graph  missing sales env file"
fi

print_section "Meta Webhook Verify Proof"
if [[ -n "${WHATSAPP_VERIFY_TOKEN:-}" ]]; then
  result="$(
    curl --max-time 5 -sS \
      "http://127.0.0.1:8082/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${WHATSAPP_VERIFY_TOKEN}&hub.challenge=123456" \
      || true
  )"
  if [[ "$result" == "123456" ]]; then
    green "ok      webhook-verify  challenge returned"
  else
    red "failed  webhook-verify  expected 123456 got: ${result:-<empty>}"
  fi
else
  yellow "warn    webhook-verify  verify token missing"
fi
