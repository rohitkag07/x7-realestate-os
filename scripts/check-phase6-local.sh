#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

check() {
  local label="$1"
  local url="$2"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
  echo "$label $code $url"
}

check "sales-agent" "http://localhost:8080/health"
check "tool-gateway" "http://localhost:8081/health"
check "summoner" "http://localhost:8082/health"
check "content-agent" "http://localhost:8083/health"
check "ads-agent" "http://localhost:8085/health"
check "ghost-closer" "http://localhost:8086/health"
check "colony-agent" "http://localhost:8087/health"
check "finance-agent" "http://localhost:8088/health"
check "dashboard-mesh" "http://localhost:3000/api/agent-mesh/health"
