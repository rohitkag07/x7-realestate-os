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
  local text="$1"
  local msg_id="$2"
  local payload_file
  payload_file="$(mktemp)"

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

  echo "POST $SUMMONER_URL/webhook"
  echo "message_id=$msg_id"
  echo "message_text=$text"
  curl -s -w '\nHTTP_STATUS:%{http_code}\n' \
    -X POST "$SUMMONER_URL/webhook" \
    -H "Content-Type: application/json" \
    -H "X-Hub-Signature-256: sha256=$sig" \
    --data-binary "@$payload_file"

  rm -f "$payload_file"
}

send_payload "Hello, mujhe coaching ke baare mein jaanna hai" "wamid.phase11.initial.$(date +%s)"
sleep 1
send_payload "JEE Coaching" "wamid.phase11.answer.$(date +%s)"
