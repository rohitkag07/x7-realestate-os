# X7 RealEstate OS Deployment Checklist

Use this file for production or near-production rollout verification.

## 1. Pre-Deploy

- confirm `ENV_CONTRACT.md` has been filled with real values
- confirm Supabase migrations are current
- confirm one shared `AGENT_SECRET` for all backend services
- confirm final public URLs for dashboard, Summoner, and specialist agents
- confirm WhatsApp and Razorpay credentials are production-safe

## 2. Supabase

- verify `SUPABASE_URL` is correct in all backend services
- verify `SUPABASE_SERVICE_ROLE_KEY` is set only where write access is needed
- verify latest migrations, including orchestration tables, are applied
- verify seed or baseline builder/project records exist for `DEFAULT_BUILDER_ID` and `DEFAULT_PROJECT_ID`

## 3. Service Deploy Order

Recommended order:

1. `x7-re-tool-gateway`
2. `x7-re-sales-agent`
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

## 6. WhatsApp Proof

Preferred public ingress:

- `GET /webhooks/whatsapp`
- `POST /webhooks/whatsapp`

Checklist:

- verify Meta challenge returns the expected `hub.challenge`
- verify `META_APP_SECRET` signature validation is enabled in production
- send one inbound test message
- confirm resident-path messages route to colony flows when resident context exists
- confirm lead-path messages route to sales flows or create a lead using default builder/project context
- confirm message status updates land in Supabase

## 7. Colony and Finance Proof

- create or fetch a resident successfully
- create a visitor or amenity/complaint action from the dashboard or agent path
- generate one booking or invoice path that touches finance records
- verify finance webhook signature handling with a Razorpay test event
- verify receipt or payment state updates persist in Supabase

## 8. Content and Ads Proof

- run one content generation request
- verify tool-gateway connectivity from content agent
- run one publish or simulated publish path for Meta
- verify ads agent can read/write expected campaign records

## 9. Dashboard Proof

- homepage loads without broken styling
- dashboard navigation works across sales and colony surfaces
- agent mesh health page reflects current service state
- at least one live data surface loads from Supabase instead of fallback/demo state

## 10. Evidence To Capture

Keep a short evidence packet after rollout:

- deployed URLs for each service
- `/health` responses
- WhatsApp webhook verification screenshot or curl output
- one successful queue or cron execution result
- one successful finance or colony write
- one dashboard screenshot using live data

## Launch Rule

Do not call the system production-ready until:

1. live Supabase is connected
2. Summoner-first ingress is proven
3. WhatsApp webhook flow is proven
4. Razorpay test webhook is proven
5. at least one live dashboard surface reads real data
