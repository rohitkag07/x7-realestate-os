#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DASHBOARD_DIR="$ROOT_DIR/apps/dashboard"
PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
NODE_BIN="${NODE_BIN:-$(command -v node)}"

cd "$DASHBOARD_DIR"

exec "$NODE_BIN" ./node_modules/next/dist/bin/next dev --hostname "$HOST" --port "$PORT"
