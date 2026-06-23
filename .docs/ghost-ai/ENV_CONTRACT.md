# X7 RealEstate OS Env Contract

This file is the source of truth for runtime environment variables expected by the current codebase.

## Shared Rules

- `AGENT_SECRET` must be identical across dashboard server routes, Summoner, and all agents.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required for write-capable backend flows.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are client-safe dashboard values.
- Local defaults are acceptable for development, but production must use explicit values.
- Prefer Summoner as the public ingress for WhatsApp webhooks and agent fan-out.

## Dashboard

File: `apps/dashboard/.env.local`

Required core values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AGENT_SECRET`
- `NEXT_PUBLIC_SITE_URL`

Agent URLs:

- `SUMMONER_URL`
- `NEXT_PUBLIC_SUMMONER_URL`
- `SALES_AGENT_URL`
- `CONTENT_AGENT_URL`
- `ADS_AGENT_URL`
- `GHOST_CLOSER_URL`
- `COLONY_AGENT_URL`
- `FINANCE_AGENT_URL`
- `TOOL_GATEWAY_URL`

Optional external integrations exposed in dashboard workflows:

- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_GRAPH_VERSION`
- `META_APP_ID`
- `META_APP_SECRET`
- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `OPENAI_API_KEY`
- `DEFAULT_BUILDER_ID`
- `DEFAULT_PROJECT_ID`

## Summoner

File: `agents/x7-re-summoner/.env`

Required:

- `PORT` default `8082`
- `AGENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Routing and default context:

- `DEFAULT_BUILDER_ID`
- `DEFAULT_PROJECT_ID`
- `SALES_AGENT_URL`
- `CONTENT_AGENT_URL`
- `ADS_AGENT_URL`
- `COLONY_AGENT_URL`
- `FINANCE_AGENT_URL`
- `GHOST_CLOSER_URL`

WhatsApp ingress:

- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_GRAPH_VERSION`
- `META_APP_SECRET`

## Sales Agent

File: `agents/x7-re-sales-agent/.env`

Required:

- `PORT` default `8080`
- `AGENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Sales and WhatsApp:

- `DEFAULT_BUILDER_ID`
- `DEFAULT_PROJECT_ID`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_GRAPH_VERSION`
- `META_APP_SECRET`

Optional intelligence and proxy:

- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SUMMONER_URL`

## Content Agent

File: `agents/x7-re-content-agent/.env`

Required:

- `PORT` default `8083`
- `NODE_ENV`
- `AGENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TOOL_GATEWAY_URL`

AI:

- `OPENAI_API_KEY`
- `OPENAI_MODEL_CONTENT`

## Ads Agent

File: `agents/x7-re-ads-agent/.env`

Required:

- `PORT` default `8085`
- `NODE_ENV`
- `AGENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Meta Ads:

- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- `META_PIXEL_ID`

## Ghost Closer

File: `agents/x7-re-ghost-closer/.env`

Required:

- `PORT` default `8086`
- `NODE_ENV`
- `AGENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TOOL_GATEWAY_URL`

AI:

- `OPENAI_API_KEY`
- `OPENAI_MODEL_OUTREACH`

## Colony Agent

File: `agents/x7-re-colony-agent/.env`

Required:

- `PORT` default `8087`
- `AGENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TOOL_GATEWAY_URL`

## Finance Agent

File: `agents/x7-re-finance-agent/.env`

Required:

- `PORT` default `8088`
- `AGENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TOOL_GATEWAY_URL`
- `COLONY_AGENT_URL`

Payments:

- `RAZORPAY_WEBHOOK_SECRET`

## Tool Gateway

File: `agents/x7-re-tool-gateway/.env`

Required:

- `PORT` default `8081`
- `NODE_ENV`
- `AGENT_SECRET`

WhatsApp:

- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`

Meta publish:

- `META_ACCESS_TOKEN`
- `META_IG_USER_ID`
- `META_FB_PAGE_ID`

Media/render:

- `HIGGSFIELD_API_KEY`
- `REMOTION_MODE`
- `REMOTION_LAMBDA_FN`
- `REMOTION_LAMBDA_REGION`
- `REMOTION_SERVE_URL`
- `REMOTION_PROJECT_DIR`

Payments:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `DEFAULT_UPI_VPA`
- `DEFAULT_UPI_NAME`

## Local Port Map

| Service | Port |
| --- | --- |
| Dashboard | `3000` |
| Sales Agent | `8080` |
| Tool Gateway | `8081` |
| Summoner | `8082` |
| Content Agent | `8083` |
| Ads Agent | `8085` |
| Ghost Closer | `8086` |
| Colony Agent | `8087` |
| Finance Agent | `8088` |

## Deployment Rule

Before any production rollout:

1. fill the env files or platform secrets from this contract
2. ensure all agent URLs point to the correct deployed services
3. verify `AGENT_SECRET` matches everywhere
4. verify Supabase service credentials are present only in backend services
