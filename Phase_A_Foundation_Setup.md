# Phase A Foundation Setup

This file is the single source of truth for Phase A foundation work on X7 RealEstate OS.

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
- The stable local dashboard runtime is currently the no-space workspace copy:
  - `/Users/rohit/Documents/Claude/Projects/X7-Real-estate-local`

## Current Verified Status (23 June 2026)

This is the current hard-proof status, not a future plan.

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
  - summoner, sales, tool-gateway, content, ads, ghost-closer, colony, finance: all reachable
- Current readiness still blocked only where real external credentials are missing:
  - WhatsApp Cloud API
  - Meta Ads
  - Razorpay
  - OpenAI
  - Remotion/Higgsfield media credentials

## Phase A Order

Follow this exact order:

1. Supabase first
2. default builder and project IDs
3. shared agent secret and local URLs
4. WhatsApp ingress
5. Meta Ads
6. Razorpay
7. OpenAI and media

Do not start with Meta or Razorpay before Supabase is live. The whole app depends on the DB backbone.

## Files You Will Touch

Primary files:

- `apps/dashboard/.env.local`
- `apps/landing/.env.local`
- `agents/x7-re-summoner/.env`
- `agents/x7-re-sales-agent/.env`
- `agents/x7-re-content-agent/.env`
- `agents/x7-re-ads-agent/.env`
- `agents/x7-re-ghost-closer/.env`
- `agents/x7-re-colony-agent/.env`
- `agents/x7-re-finance-agent/.env`
- `agents/x7-re-tool-gateway/.env`

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
- `CONTENT_AGENT_URL=http://localhost:8083`
- `ADS_AGENT_URL=http://localhost:8085`
- `GHOST_CLOSER_URL=http://localhost:8086`
- `COLONY_AGENT_URL=http://localhost:8087`
- `FINANCE_AGENT_URL=http://localhost:8088`
- `TOOL_GATEWAY_URL=http://localhost:8081`

## Minimal Success Criteria For Phase A

Phase A is successful when all of this is true:

1. `/api/ops/readiness` shows Supabase client as ready
2. `/api/ops/readiness` shows Supabase service role as ready
3. `/api/ops/readiness` shows default builder context as ready
4. `/api/agent-mesh/health` reports `supabase: true` for services that need it
5. dashboard data probes for builders, projects, leads, and residents stop showing `blocked`
6. landing project pages stop failing due to missing Supabase env

## Phase A Result

Phase A foundation is now effectively complete for the local stack baseline.

What is done:

- dashboard env wiring is in place
- landing env wiring is in place
- agent env wiring is in place
- default builder and project IDs are set
- Supabase live probes are passing
- dashboard readiness JSON now reflects real runtime state
- local agent mesh is healthy

What is not part of Phase A:

- real Meta credentials
- real WhatsApp Business credentials
- real Razorpay keys and webhook secret
- real OpenAI key
- real Remotion/Higgsfield media execution config

## Manual Inputs Still Needed From You

You do not need to push tables manually anymore. That work is already done.

The only remaining manual inputs are third-party credentials.

### Step 1: WhatsApp credentials

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`

### Step 2: Meta Ads credentials

- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`

### Step 3: Razorpay credentials

- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

### Step 4: AI and media credentials

- `OPENAI_API_KEY`
- `REMOTION_MODE`
- optional `HIGGSFIELD_API_KEY`

### Step 5: Restart and recheck

After adding any of the above, restart the affected services and recheck:

- `http://127.0.0.1:3000/api/ops/readiness`
- `http://127.0.0.1:3000/api/agent-mesh/health`
- `http://127.0.0.1:3001/shree-krishna-developers/krishna-greens-super-corridor`

## Manual Steps Later, Not First

Do these only after Supabase is proven live.

### WhatsApp

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`

### Meta Ads

- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- optional publish IDs in tool-gateway

### Razorpay

- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID` for tool-gateway

### OpenAI and Media

- `OPENAI_API_KEY`
- `REMOTION_MODE`
- optional `HIGGSFIELD_API_KEY`

## Notes

- If env files contain values but readiness still says `blocked`, the app process was likely started before the env change or from a different workspace copy.
- For local testing, prefer the no-space dashboard runtime path:
  - `/Users/rohit/Documents/Claude/Projects/X7-Real-estate-local/apps/dashboard`
- The first hard proof is not the file content. The first hard proof is the JSON returned by `/api/ops/readiness`.
- The Supabase plugin can give us project inventory and project URL, but it does not expose anon or service-role keys in this session. Those still need to be copied from the Supabase dashboard.
- If your Supabase project uses the newer key model, map it like this in this repo:
  - `SUPABASE_PUBLISHABLE_KEY` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SECRET_KEY` -> `SUPABASE_SERVICE_ROLE_KEY`
- In this repo, the seeded default IDs are:
  - `DEFAULT_BUILDER_ID=11111111-1111-1111-1111-111111111111`
  - `DEFAULT_PROJECT_ID=22222222-2222-2222-2222-222222222222`
