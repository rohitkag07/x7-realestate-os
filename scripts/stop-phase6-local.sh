#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_DIR="$ROOT_DIR/.codex-runtime/phase6/pids"

if [[ ! -d "$PID_DIR" ]]; then
  echo "no phase6 pid directory found"
  exit 0
fi

for pid_file in "$PID_DIR"/*.pid; do
  [[ -e "$pid_file" ]] || continue
  pid="$(cat "$pid_file")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    echo "stopped $(basename "$pid_file" .pid)"
  fi
  rm -f "$pid_file"
done

for port in 8080 8081 8082 8083 8085 8086 8087 8088; do
  for pid in $(lsof -ti tcp:"$port" 2>/dev/null || true); do
    kill "$pid" 2>/dev/null || true
    echo "stopped pid $pid on port $port"
  done
done
