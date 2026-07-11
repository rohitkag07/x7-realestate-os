# X7 WhatsAI Assistant - WhatsApp-First Lead Conversion Platform

Formerly positioned as X7 RealEstate OS, this repo is now pivoting into a horizontal WhatsApp AI assistant platform for Indian businesses.

The existing real-estate system is not being discarded. It becomes the first vertical pack: `X7 SiteVisit AI` for builders and brokers.

## Current Positioning

WhatsAI Assistant is a 24/7 WhatsApp receptionist, lead qualifier, follow-up assistant, and owner handoff system for Indian SMBs.

Primary buyer promise:

> Customer WhatsApp message ka instant reply, lead qualification, follow-up, appointment/site-visit booking, aur owner ko daily hot-lead summary.

## First Vertical Packs

| Pack | Buyer | Main conversion goal |
| --- | --- | --- |
| X7 SiteVisit AI | real-estate builders and brokers | qualified site visit |
| X7 Appointment AI | clinics and local healthcare providers | appointment booking |
| X7 Admission AI | coaching and education businesses | demo class or counselor callback |
| X7 Fitness Intake AI | gyms and dietitians | trial session or plan inquiry |
| X7 Callback AI | local service businesses | qualified callback |

## What Already Exists

The repo already contains a meaningful base that should be reused:

- Next.js dashboard shell
- lead pipeline and manual CRM flows
- site visit / booking style workflows
- WhatsApp-oriented sales paths
- follow-up queue concepts
- Summoner-first agent orchestration
- sales-agent, Summoner, and Tool Gateway runtime
- Supabase persistence
- real-estate vertical implementation
- deferred vertical modules for later expansion

## Main App

| App | Path | Purpose |
| --- | --- | --- |
| Dashboard | root `src/` | Active Next.js operator dashboard for trials, leads, conversations, appointments, integrations, and real-estate vertical surfaces. |

Canonical local repo path:

```text
/Users/rohit/Projects/x7-realestate-os
```

Do not use `/Users/rohit/Documents/Claude/Projects/X7 Real estate` for new WhatsAI work. That folder is deprecated and kept only as a temporary safety backup.

## Backend Agents

Launch-critical agents live in `agents/`:

- `x7-re-summoner` - routing, WhatsApp ingress, queue/cron orchestration
- `x7-re-tool-gateway` - WhatsApp send, UPI/payment links, PDFs, media helpers
- `x7-re-sales-agent` - first assistant logic layer and real-estate qualification

Deferred agents are not launch blockers for WhatsAI MVP:

- `x7-re-content-agent`
- `x7-re-ads-agent`
- `x7-re-ghost-closer`
- `x7-re-colony-agent`
- `x7-re-finance-agent`

## Documentation

Start here:

- `X7_WhatsAI_Pivot_Strategy.md`
- `.docs/ghost-ai/DOCS_INDEX.md`
- `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`
- `.docs/ghost-ai/NEXT_BUILD_PLAN.md`
- `.docs/ghost-ai/ENV_CONTRACT.md`
- `.docs/ghost-ai/PRODUCTION_READINESS.md`
- `.docs/ghost-ai/DEPLOYMENT_CHECKLIST.md`

Long reference docs remain useful, but should be read as pre-pivot context:

- `X7_RealEstate_Blueprint.md`
- `X7_Evolution_Blueprint.md`
- `SSMA.md`
- `X7_Revenue_Engines.md`

## Local Setup

Always work from the canonical path:

```bash
cd /Users/rohit/Projects/x7-realestate-os
```

Install dependencies inside the app or agent you are working on:

```bash
npm install
```

Run dashboard:

```bash
npm run dev
```

Default URL: `http://localhost:3000`.

Run the agent mesh:

```bash
pm2 start ecosystem.config.cjs --update-env
pm2 list
```

Stop the local mesh:

```bash
pm2 stop x7-sales-agent x7-tool-gateway x7-summoner
```

Run the complete WhatsAI readiness proof:

```bash
npm run prove:whatsai
```

This checks required env, PM2 health on ports `8080`, `8081`, `8082`, WhatsApp webhook verification, and Supabase `conversation_threads`.

## Current Build Rule

Do not rebuild from scratch. Add the generic WhatsAI business/playbook layer beside the current real-estate implementation, preserve working real-estate flows, and migrate to generic routes only after parity is proven.

## Launch Blockers

Launch blockers for the current WhatsAI MVP are only:

- Supabase env and canonical conversation tables are not reachable.
- The three active PM2 agents are not online: sales-agent, tool-gateway, summoner.
- WhatsApp Cloud API token or verify token is missing/invalid.
- Public webhook verification cannot return `200`.

Razorpay, content generation, colony management, finance workflows, OpenAI content, and advanced Meta Ads are deferred modules. They are not blockers for the WhatsAI lead-to-appointment MVP.
