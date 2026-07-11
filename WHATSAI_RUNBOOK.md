# WhatsAI Runbook

Canonical repo:

```bash
cd /Users/rohit/Projects/x7-realestate-os
```

Do not use `/Users/rohit/Documents/Claude/Projects/X7 Real estate` for new work.

## 1. Env Setup

Create or update `.env.local` using `.env.example`.

Required for local proof:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AGENT_SECRET`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `SUMMONER_URL=http://localhost:8082`
- `SALES_AGENT_URL=http://localhost:8080`
- `TOOL_GATEWAY_URL=http://localhost:8081`

Also keep the same WhatsApp and Supabase values in:

- `agents/x7-re-summoner/.env`
- `agents/x7-re-tool-gateway/.env`
- `agents/x7-re-sales-agent/.env`

## 2. Start Dashboard

```bash
npm install
npm run dev
```

Dashboard URL:

```text
http://localhost:3000
```

Important pages:

- `http://localhost:3000/conversations`
- `http://localhost:3000/assistant-setup`
- `http://localhost:3000/leads`

## 3. Start Agents

Only three agents are required for the WhatsAI MVP:

```bash
pm2 start ecosystem.config.cjs --update-env
pm2 list
```

Expected PM2 apps:

- `x7-sales-agent` on `8080`
- `x7-tool-gateway` on `8081`
- `x7-summoner` on `8082`

Health checks:

```bash
curl -i http://localhost:8080/health
curl -i http://localhost:8081/health
curl -i http://localhost:8082/health
```

Logs:

```bash
pm2 logs x7-summoner x7-sales-agent x7-tool-gateway --lines 100
```

## 4. Prove Local Runtime

Run:

```bash
npm run prove:whatsai
```

This checks:

- required env exists
- PM2 agents are online
- `GET /health` returns `200` for ports `8080`, `8081`, `8082`
- Summoner WhatsApp webhook verify returns `200`
- Supabase is reachable and `conversation_threads` exists

If any check fails, follow the printed fix instruction.

## 5. Test Webhook Verify

Manual verify command:

```bash
curl -i "http://localhost:8082/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=local-proof"
```

Expected:

- HTTP `200`
- response body `local-proof`

## 6. Public Meta Webhook

Expose Summoner:

```bash
ngrok http 8082
```

Meta callback URL:

```text
https://YOUR-NGROK-DOMAIN/webhooks/whatsapp
```

Meta verify token:

```text
WHATSAPP_VERIFY_TOKEN
```

After Meta verifies, send one WhatsApp message from the test phone and confirm:

- `conversation_contacts` row exists or updates
- `conversation_threads` row exists
- `conversation_messages` inbound row exists
- `/conversations` shows the thread

## 7. Access Dashboard

Open:

```text
http://localhost:3000/conversations
```

Expected operator flow:

- left pane shows threads
- center pane shows messages
- right panel shows lead qualification, appointment state, and handoff state
- `Pause AI / Takeover` can put a thread into human control

## 8. Deferred Modules

These are not blockers for the WhatsAI MVP:

- Razorpay/payment automation
- content generation
- colony/resident management
- finance/receipt workflows
- advanced Meta Ads automation
- OpenAI-generated marketing content

Build them after the lead-to-appointment WhatsApp flow is stable.
