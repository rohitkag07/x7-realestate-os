# Phase A Foundation Setup
> [!IMPORTANT]
> Pivot note (2026-07-11): Phase A is now foundation history. Active WhatsAI MVP proof is `npm run prove:whatsai` from `/Users/rohit/Projects/whatsai-assistant`.


This file is historical context for Phase A foundation work on WhatsAI Assistant.
For current launch operations use `WHATSAI_RUNBOOK.md`.

## Goal

Turn the current local demo stack into a real, env-backed app foundation by:

1. standardizing credentials and runtime env files
2. connecting the dashboard and agents to the same Supabase project
3. setting the default builder and project context
4. making the readiness panel report real status instead of blanket `blocked`

## Current Repo Truth

- The UI shell is built and the local agent mesh boots.
- Supabase foundation is now live on project `yxiniazontslpivaoxfb`.
- Core dashboard probes are no longer blanket `blocked`; the readiness panel now reports real green and blocked groups separately.
- The main blocker is not page scaffolding anymore. The blocker is remaining vendor credentials and production-grade local run discipline.
- The stable local dashboard runtime is the canonical no-space repo:
  - `/Users/rohit/Projects/whatsai-assistant`

## Current Verified Status (24 June 2026)

This is the current hard-proof status, not a future plan.

- Latest production checkpoint:
  - Vercel production env now includes live Supabase and WhatsApp credentials.
  - Production `GET /api/ping` returns `200`.
  - Production `GET /api/webhooks/whatsapp` verify challenge returns `200`.
  - Production signed inbound webhook writes to live `whatsapp_messages` and `agent_runs`.
  - Remaining last-mile item is a fresh production deploy after WhatsApp token rotation so outbound reply can be rechecked on the live alias.

- Supabase schema is deployed through Phase 6 orchestration tables.
- Runtime seed data is present for:
  - `builders`
  - `projects`
  - `leads`
  - `plots`
  - `site_visits`
  - `bookings`
  - `content_calendar`
  - `ad_campaigns`
  - `residents`
  - `maintenance_invoices`
  - `complaints`
  - `visitors`
  - `landing_pages`
  - `colony_settings`
  - `amenities`
  - `colony_staff`
- Verified live table counts:
  - `builders`: 1
  - `projects`: 1
  - `leads`: 7
  - `residents`: 2
  - `landing_pages`: 1
  - `amenities`: 3
- Verified local health:
  - dashboard `GET /api/ping`: ready
  - dashboard `GET /api/ops/readiness`: ready
  - landing project route loads from live Supabase
  - launch-critical WhatsAI services are reachable: summoner, sales-agent, tool-gateway
- Verified WhatsApp proof:
  - Meta test number is active
  - verified recipient `+91 78691 61842` received:
    - template `hello_world`
    - custom tool-gateway outbound text
    - bilingual sales-agent outbound reply
  - inbound webhook logic was proven locally with signed payload simulation into Summoner
  - `whatsapp_messages` and `agent_runs` both recorded the inbound flow correctly after duplicate-write handling was fixed
- Verified rollout work:
  - git repository initialized
  - GitHub repo pushed:
    - `https://github.com/rohitkag07/whatsai-assistant`
  - Vercel production project exists:
    - `whatsai-assistant`
    - `https://whatsai-assistant.vercel.app`
- Current WhatsAI MVP readiness is proven by `npm run prove:whatsai`.
- Meta Ads, Razorpay, OpenAI, Remotion/Higgsfield, content, colony, and finance are deferred modules, not launch blockers.

## Phase A Order

Follow this exact order:

1. Supabase first
2. default builder and project IDs
3. shared agent secret and local URLs
4. WhatsApp ingress
5. run `npm run prove:whatsai`

Do not block WhatsAI MVP launch on Meta Ads, Razorpay, OpenAI, content, colony, or finance.

## Files You Will Touch

Primary files:

- `apps/dashboard/.env.local`
- `agents/x7-re-summoner/.env`
- `agents/x7-re-sales-agent/.env`
- `agents/x7-re-tool-gateway/.env`
- `.env.example`

Examples:

- `apps/dashboard/.env.local.example`
- `apps/landing/.env.local.example`
- `agents/*/.env.example`

## Shared Values

These values should stay aligned across services.

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

Rule:

- For the dashboard and landing app, use `NEXT_PUBLIC_SUPABASE_URL`.
- For agents, use `SUPABASE_URL`.
- `SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_URL` should point to the same Supabase project URL.

### Default Context

- `DEFAULT_BUILDER_ID`
- `DEFAULT_PROJECT_ID`

These should be real UUIDs from your seeded or manually created builder and project rows.

### Shared Local Mesh

- `AGENT_SECRET`
- `SUMMONER_URL=http://localhost:8082`
- `SALES_AGENT_URL=http://localhost:8080`
- `TOOL_GATEWAY_URL=http://localhost:8081`

## Minimal Success Criteria For Phase A

Phase A is successful when all of this is true:

1. `npm run prove:whatsai` passes
2. dashboard runs from `/Users/rohit/Projects/whatsai-assistant`
3. PM2 shows `whatsai-sales-agent`, `whatsai-tool-gateway`, and `whatsai-summoner` online
4. Summoner webhook verify returns `200`
5. Supabase `conversation_threads` is reachable

## Phase A Result

Phase A foundation is now effectively complete for the live baseline.

What is done:

- dashboard env wiring is in place
- landing env wiring is in place
- agent env wiring is in place
- default builder and project IDs are set
- Supabase live probes are passing
- dashboard readiness JSON now reflects real runtime state
- local agent mesh is healthy
- GitHub remote is established for rollout continuity
- WhatsApp outbound has been proven with the real Meta test number
- local inbound WhatsApp routing has been proven through Summoner
- Vercel production project for this repo exists and is linked to GitHub main

What is not part of Phase A:

- Meta Ads automation
- Razorpay/payment automation
- OpenAI content generation
- Remotion/Higgsfield media execution
- colony/finance/content-agent launch proof

## Current External Blockers

These are no longer WhatsAI MVP launch blockers.

- Deferred module credentials can be added after the WhatsApp lead-to-appointment flow is stable.

## Immediate Next Actions

1. Start PM2 with `pm2 start ecosystem.config.cjs --update-env`.
2. Run `npm run prove:whatsai`.
3. Send one real inbound WhatsApp message and confirm:
   - canonical contact/thread/message rows
   - lead qualification answer
   - thread appears in `/conversations`

## Automation Added

Use this command from repo root any time you want a hard-proof rollout snapshot:

```bash
npm run phase-a:check
```

Legacy checker. Prefer:

```bash
npm run prove:whatsai
```

## Manual Inputs Still Needed From You

You do not need to push tables manually anymore. That work is already done.

For the current WhatsAI MVP, the only launch-critical manual inputs are WhatsApp credentials.

### Step 1: WhatsApp credentials

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`

### Step 2: Restart and recheck

After adding any of the above, restart the affected services and recheck:

- `npm run prove:whatsai`
- `http://127.0.0.1:3000/conversations`

## Manual Steps Later, Not First

Do these only after the WhatsAI lead-to-appointment path is stable.

### WhatsApp

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`

### Deferred Meta Ads

- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- optional publish IDs in tool-gateway

### Deferred Razorpay

- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID` for tool-gateway

### Deferred OpenAI and Media

- `OPENAI_API_KEY`
- `REMOTION_MODE`
- optional `HIGGSFIELD_API_KEY`

## Notes

- If env files contain values but readiness still says `blocked`, the app process was likely started before the env change or from a different workspace copy.
- For local testing, prefer the canonical no-space repo path:
  - `/Users/rohit/Projects/whatsai-assistant`
- The first hard proof is not the file content. The first hard proof is `npm run prove:whatsai`.
- The Supabase plugin can give us project inventory and project URL, but it does not expose anon or service-role keys in this session. Those still need to be copied from the Supabase dashboard.
- If your Supabase project uses the newer key model, map it like this in this repo:
  - `SUPABASE_PUBLISHABLE_KEY` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SECRET_KEY` -> `SUPABASE_SERVICE_ROLE_KEY`
- In this repo, the seeded default IDs are:
  - `DEFAULT_BUILDER_ID=11111111-1111-1111-1111-111111111111`
  - `DEFAULT_PROJECT_ID=22222222-2222-2222-2222-222222222222`
