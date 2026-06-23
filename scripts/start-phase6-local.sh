#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.codex-runtime/phase6"
LOG_DIR="$RUN_DIR/logs"
PID_DIR="$RUN_DIR/pids"
NODE_BIN="${NODE_BIN:-$(command -v node)}"

mkdir -p "$LOG_DIR" "$PID_DIR"

start_agent() {
  local name="$1"
  local dir="$2"
  local log_file="$LOG_DIR/$name.log"
  local pid_file="$PID_DIR/$name.pid"

  if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "$name already running on pid $(cat "$pid_file")"
    return
  fi

  (
    cd "$ROOT_DIR/$dir"
    if [[ ! -d node_modules ]]; then
      npm install --omit=dev >/dev/null
    fi
    nohup "$NODE_BIN" --env-file=.env index.js >"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )

  echo "started $name"
}

start_agent "sales-agent" "agents/x7-re-sales-agent"
start_agent "tool-gateway" "agents/x7-re-tool-gateway"
start_agent "content-agent" "agents/x7-re-content-agent"
start_agent "ads-agent" "agents/x7-re-ads-agent"
start_agent "ghost-closer" "agents/x7-re-ghost-closer"
start_agent "colony-agent" "agents/x7-re-colony-agent"
start_agent "finance-agent" "agents/x7-re-finance-agent"
start_agent "summoner" "agents/x7-re-summoner"

echo "phase6 local stack boot requested"
