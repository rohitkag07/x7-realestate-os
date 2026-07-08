# X7 WhatsAI Assistant Deployment Checklist

Use this file for production or near-production rollout verification.

## 1. Pre-Deploy

- confirm `ENV_CONTRACT.md` has been filled with real values
- confirm Supabase migrations are current
- confirm one shared `AGENT_SECRET` for all backend services
- confirm final public URLs for dashboard, Summoner, and specialist agents
- confirm WhatsApp and Razorpay credentials are production-safe
- confirm at least one `business` / `assistant_playbook` / trial context exists once the pivot schema is added

## 2. Supabase

- verify `SUPABASE_URL` is correct in all backend services
- verify `SUPABASE_SERVICE_ROLE_KEY` is set only where write access is needed
- verify latest migrations, including orchestration tables, are applied
- verify seed or baseline records exist for the current compatibility layer:
  - `DEFAULT_BUILDER_ID` and `DEFAULT_PROJECT_ID` for real-estate vertical
  - `DEFAULT_BUSINESS_ID` and `DEFAULT_ASSISTANT_PLAYBOOK_ID` once generic schema exists

## 3. Service Deploy Order

Recommended order:

1. `x7-re-tool-gateway`
2. `x7-re-sales-agent` / assistant-agent compatibility service
3. `x7-re-content-agent`
4. `x7-re-ads-agent`
5. `x7-re-ghost-closer`
6. `x7-re-colony-agent`
7. `x7-re-finance-agent`
8. `x7-re-summoner`
9. `apps/dashboard`

Reason:

- Summoner depends on stable downstream agent URLs.
- Dashboard should deploy after backend URLs are stable.

## 4. Health Checks

Every service must return `200` from `/health`.

Expected local equivalents:

- `http://localhost:8080/health`
- `http://localhost:8081/health`
- `http://localhost:8082/health`
- `http://localhost:8083/health`
- `http://localhost:8085/health`
- `http://localhost:8086/health`
- `http://localhost:8087/health`
- `http://localhost:8088/health`
- `http://localhost:3000/api/agent-mesh/health`

Also verify dependency endpoints where available:

- Summoner `/health/dependencies`
- Colony agent `/health/dependencies`
- Finance agent `/health/dependencies`

## 5. Summoner Routing Proof

- verify Summoner can reach all downstream agents
- verify queue endpoints respond:
  - `POST /queue/enqueue`
  - `POST /queue/drain`
- verify cron endpoints respond:
  - `POST /cron/run-job`
  - `POST /cron/run-all`
- verify dashboard routes that depend on Summoner are using the correct base URL

## 6. WhatsAI Trial Proof

Preferred public ingress:

- `GET /webhooks/whatsapp`
- `POST /webhooks/whatsapp`

Checklist:

- verify Meta challenge returns the expected `hub.challenge`
- verify `META_APP_SECRET` signature validation is enabled in production
- send one inbound test message
- confirm business context resolves from phone/channel/default trial config
- confirm assistant playbook is selected
- confirm message is persisted in generic conversation tables once built
- confirm reply is sent over WhatsApp
- confirm hot/confused lead creates owner handoff
- confirm follow-up or daily summary is queued

## 7. Real-Estate Vertical Proof

Use X7 SiteVisit AI as the first vertical pack.

- inbound buyer inquiry enters WhatsApp
- assistant asks budget/location/property/timeline questions
- lead appears in dashboard
- site visit or owner handoff is created
- follow-up queue persists
- owner receives summary or handoff

## 8. Finance Proof

- verify payment state path using Razorpay test event where available
- verify webhook signature handling
- verify receipt or payment state updates persist in Supabase
- do not claim subscription success without verified payment or manual invoice state

## 9. Dashboard Proof

- homepage loads without broken styling
- dashboard navigation works across lead/conversation surfaces
- settings/readiness reflects current service state
- at least one live data surface loads from Supabase instead of fallback/demo state
- trial business can be inspected by owner/operator

## 10. Evidence To Capture

Keep a short evidence packet after rollout:

- deployed URLs for each service
- `/health` responses
- WhatsApp webhook verification screenshot or curl output
- one inbound message and outbound reply proof
- one successful lead/conversation write
- one handoff or follow-up queue proof
- one dashboard screenshot using live data

## Launch Rule

Do not call the pivot trial-ready until:

1. live Supabase is connected
2. Summoner-first ingress is proven
3. WhatsApp webhook flow is proven
4. business/playbook context resolves
5. one vertical flow works end-to-end
6. owner handoff or daily summary works
7. at least one live dashboard surface reads real data
