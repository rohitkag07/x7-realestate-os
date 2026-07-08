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
- specialist agents and Tool Gateway
- Supabase persistence
- real-estate vertical implementation
- colony/society module for later vertical expansion

## Main App

| App | Path | Purpose |
| --- | --- | --- |
| Dashboard | `apps/dashboard` | Operator dashboard for trials, leads, conversations, appointments, integrations, and real-estate vertical surfaces. |

## Backend Agents

Agents live in `agents/`:

- `x7-re-summoner` - routing, WhatsApp ingress, queue/cron orchestration
- `x7-re-tool-gateway` - WhatsApp send, UPI/payment links, PDFs, media helpers
- `x7-re-sales-agent` - first assistant logic layer and real-estate qualification
- `x7-re-content-agent` - deferred content generation
- `x7-re-ads-agent` - deferred campaign operations
- `x7-re-ghost-closer` - deferred outbound prospecting
- `x7-re-colony-agent` - later society/resident vertical pack
- `x7-re-finance-agent` - payment confirmation and receipt paths

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

Install dependencies inside the app or agent you are working on:

```bash
npm install
```

Run dashboard:

```bash
cd apps/dashboard
npm run dev
```

Run the agent mesh:

```bash
./scripts/start-phase6-local.sh
./scripts/check-phase6-local.sh
./scripts/check-rollout-readiness.sh
```

Stop the local mesh:

```bash
./scripts/stop-phase6-local.sh
```

## Current Build Rule

Do not rebuild from scratch. Add the generic WhatsAI business/playbook layer beside the current real-estate implementation, preserve working real-estate flows, and migrate to generic routes only after parity is proven.
