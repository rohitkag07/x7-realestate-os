#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILES=(
  "$ROOT_DIR/agents/x7-re-summoner/.env"
  "$ROOT_DIR/agents/x7-re-sales-agent/.env"
  "$ROOT_DIR/agents/x7-re-tool-gateway/.env"
)

if [[ -n "${NEW_WHATSAPP_TOKEN:-}" ]]; then
  TOKEN="$NEW_WHATSAPP_TOKEN"
else
  printf "Paste latest Meta WhatsApp access token: " >&2
  stty -echo
  read -r TOKEN
  stty echo
  printf "\n" >&2
fi

if [[ -z "$TOKEN" || ${#TOKEN} -lt 80 ]]; then
  echo "Token looks empty/too short. Aborting." >&2
  exit 1
fi

for file in "${ENV_FILES[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing env file: $file" >&2
    exit 1
  fi

  python3 - "$file" "$TOKEN" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
token = sys.argv[2]
lines = path.read_text().splitlines()
keys = {"WHATSAPP_ACCESS_TOKEN", "WHATSAPP_TOKEN"}
seen = set()
out = []

for line in lines:
    if "=" in line and not line.lstrip().startswith("#"):
        key, _ = line.split("=", 1)
        if key in keys:
            out.append(f"{key}={token}")
            seen.add(key)
            continue
    out.append(line)

for key in sorted(keys - seen):
    out.append(f"{key}={token}")

path.write_text("\n".join(out) + "\n")
PY
  echo "Updated $(realpath --relative-to="$ROOT_DIR" "$file")"
done

echo "Token synced. Restart agents with:"
echo "  pkill -f 'agents/x7-re' || true"
echo "  ./scripts/start-phase6-local.sh"
