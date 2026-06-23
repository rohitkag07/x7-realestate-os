#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANDING_DIR="$ROOT_DIR/apps/landing"
PORT="${PORT:-3001}"
HOST="${HOST:-127.0.0.1}"
NODE_BIN="${NODE_BIN:-$(command -v node)}"

cd "$LANDING_DIR"

exec "$NODE_BIN" ./node_modules/next/dist/bin/next dev --hostname "$HOST" --port "$PORT"
