#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/agents/x7-re-summoner/.env"
SUMMONER_URL="${SUMMONER_URL:-http://localhost:8082}"
PHONE_FROM="${PHONE_FROM:-919999888877}"

env_value() {
  local key="$1"
  awk -F= -v k="$key" '$1 == k { sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE"
}

META_APP_SECRET="$(env_value META_APP_SECRET)"
PHONE_NUMBER_ID="$(env_value WHATSAPP_PHONE_NUMBER_ID)"
if [[ -z "$PHONE_NUMBER_ID" ]]; then
  PHONE_NUMBER_ID="$(env_value WHATSAPP_PHONE_ID)"
fi

if [[ -z "$META_APP_SECRET" ]]; then
  echo "META_APP_SECRET missing in agents/x7-re-summoner/.env" >&2
  exit 1
fi

if [[ -z "$PHONE_NUMBER_ID" ]]; then
  echo "WHATSAPP_PHONE_NUMBER_ID missing in agents/x7-re-summoner/.env" >&2
  exit 1
fi

send_payload() {
  local index="$1"
  local text="$2"
  local payload_file
  payload_file="$(mktemp)"
  local msg_id="wamid.phase11.step6.${index}.$(date +%s)"

  cat >"$payload_file" <<JSON
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "phase11-waba",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "919876543210",
              "phone_number_id": "$PHONE_NUMBER_ID"
            },
            "contacts": [
              {
                "profile": { "name": "Phase 11 Coaching Lead" },
                "wa_id": "$PHONE_FROM"
              }
            ],
            "messages": [
              {
                "from": "$PHONE_FROM",
                "id": "$msg_id",
                "timestamp": "$(date +%s)",
                "type": "text",
                "text": { "body": "$text" }
              }
            ]
          }
        }
      ]
    }
  ]
}
JSON

  local sig
  sig="$(openssl dgst -sha256 -hmac "$META_APP_SECRET" -binary "$payload_file" | xxd -p -c 256)"

  echo "MESSAGE_${index}: $text"
  curl -s -w '\nHTTP_STATUS:%{http_code}\n' \
    -X POST "$SUMMONER_URL/webhook" \
    -H "Content-Type: application/json" \
    -H "X-Hub-Signature-256: sha256=$sig" \
    --data-binary "@$payload_file"
  echo

  rm -f "$payload_file"
}

messages=(
  "Hello, mujhe coaching ke baare mein puchna tha"
  "JEE mains ki tayyari karni hai"
  "12th class mein hu"
  "Jald se jald start karna chahta hu, fees kya hai aur admission kab le sakte hain?"
)

for i in "${!messages[@]}"; do
  send_payload "$((i + 1))" "${messages[$i]}"
  if [[ "$i" -lt 3 ]]; then
    sleep 1
  fi
done
