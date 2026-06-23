#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

check_var() {
  local file="$1"
  local var="$2"

  if [[ ! -f "$file" ]]; then
    printf "missing-file  %s  (%s)\n" "$var" "$file"
    return
  fi

  local line
  line="$(grep -E "^${var}=" "$file" | tail -n 1 || true)"

  if [[ -z "$line" ]]; then
    printf "missing       %s  (%s)\n" "$var" "$file"
    return
  fi

  local value="${line#*=}"
  value="${value%$'\r'}"

  if [[ -z "$value" ]]; then
    printf "empty         %s  (%s)\n" "$var" "$file"
  else
    printf "set           %s  (%s)\n" "$var" "$file"
  fi
}

print_group() {
  local title="$1"
  shift
  printf "\n== %s ==\n" "$title"
  while (($#)); do
    local file="$1"
    local var="$2"
    check_var "$ROOT_DIR/$file" "$var"
    shift 2
  done
}

print_group "Dashboard" \
  "apps/dashboard/.env.local" "NEXT_PUBLIC_SUPABASE_URL" \
  "apps/dashboard/.env.local" "NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "apps/dashboard/.env.local" "SUPABASE_SERVICE_ROLE_KEY" \
  "apps/dashboard/.env.local" "DEFAULT_BUILDER_ID" \
  "apps/dashboard/.env.local" "DEFAULT_PROJECT_ID" \
  "apps/dashboard/.env.local" "AGENT_SECRET"

print_group "Landing" \
  "apps/landing/.env.local" "NEXT_PUBLIC_SUPABASE_URL" \
  "apps/landing/.env.local" "NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "apps/landing/.env.local" "SUPABASE_SERVICE_ROLE_KEY"

print_group "Summoner" \
  "agents/x7-re-summoner/.env" "SUPABASE_URL" \
  "agents/x7-re-summoner/.env" "SUPABASE_SERVICE_ROLE_KEY" \
  "agents/x7-re-summoner/.env" "DEFAULT_BUILDER_ID" \
  "agents/x7-re-summoner/.env" "DEFAULT_PROJECT_ID" \
  "agents/x7-re-summoner/.env" "AGENT_SECRET"

print_group "Sales Agent" \
  "agents/x7-re-sales-agent/.env" "SUPABASE_URL" \
  "agents/x7-re-sales-agent/.env" "SUPABASE_SERVICE_ROLE_KEY" \
  "agents/x7-re-sales-agent/.env" "DEFAULT_BUILDER_ID" \
  "agents/x7-re-sales-agent/.env" "DEFAULT_PROJECT_ID" \
  "agents/x7-re-sales-agent/.env" "AGENT_SECRET"

print_group "Content Agent" \
  "agents/x7-re-content-agent/.env" "SUPABASE_URL" \
  "agents/x7-re-content-agent/.env" "SUPABASE_SERVICE_ROLE_KEY" \
  "agents/x7-re-content-agent/.env" "AGENT_SECRET"

print_group "Ads Agent" \
  "agents/x7-re-ads-agent/.env" "SUPABASE_URL" \
  "agents/x7-re-ads-agent/.env" "SUPABASE_SERVICE_ROLE_KEY" \
  "agents/x7-re-ads-agent/.env" "AGENT_SECRET"

print_group "Ghost Closer" \
  "agents/x7-re-ghost-closer/.env" "SUPABASE_URL" \
  "agents/x7-re-ghost-closer/.env" "SUPABASE_SERVICE_ROLE_KEY" \
  "agents/x7-re-ghost-closer/.env" "AGENT_SECRET"

print_group "Colony Agent" \
  "agents/x7-re-colony-agent/.env" "SUPABASE_URL" \
  "agents/x7-re-colony-agent/.env" "SUPABASE_SERVICE_ROLE_KEY" \
  "agents/x7-re-colony-agent/.env" "AGENT_SECRET"

print_group "Finance Agent" \
  "agents/x7-re-finance-agent/.env" "SUPABASE_URL" \
  "agents/x7-re-finance-agent/.env" "SUPABASE_SERVICE_ROLE_KEY" \
  "agents/x7-re-finance-agent/.env" "AGENT_SECRET"

print_group "Tool Gateway" \
  "agents/x7-re-tool-gateway/.env" "AGENT_SECRET" \
  "agents/x7-re-tool-gateway/.env" "REMOTION_MODE"

printf "\nTip: after changing env files, restart dashboard, landing, and all agents before trusting readiness JSON.\n"
