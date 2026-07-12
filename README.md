# WhatsAI Assistant - WhatsApp-First Lead Conversion Platform

This repo is the canonical WhatsAI Assistant codebase for a deterministic WhatsApp receptionist platform for Indian businesses.

The existing real-estate system is not being discarded. It becomes the first vertical pack: `WhatsAI SiteVisit` for builders and brokers.

## Current Positioning

WhatsAI Assistant is a 24/7 rule-based WhatsApp receptionist, lead qualifier, follow-up assistant, and owner handoff system for Indian SMBs. Automated replies are exact business-approved keyword responses; no LLM key is required.

Primary buyer promise:

> Customer WhatsApp message ka instant reply, lead qualification, follow-up, appointment/site-visit booking, aur owner ko daily hot-lead summary.

## First Vertical Packs

| Pack | Buyer | Main conversion goal |
| --- | --- | --- |
| WhatsAI SiteVisit | real-estate builders and brokers | qualified site visit |
| WhatsAI Appointment | clinics and local healthcare providers | appointment booking |
| WhatsAI Admission | coaching and education businesses | demo class or counselor callback |
| WhatsAI Fitness Intake | gyms and dietitians | trial session or plan inquiry |
| WhatsAI Callback | local service businesses | qualified callback |

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
/Users/rohit/Projects/whatsai-assistant
```

Do not use the deprecated spaced Claude project copy for new WhatsAI work. It is kept only as a temporary safety backup.

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

- `WHATSAI_PIVOT_STRATEGY.md`
- `.docs/ghost-ai/DOCS_INDEX.md`
- `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`
- `.docs/ghost-ai/NEXT_BUILD_PLAN.md`
- `.docs/ghost-ai/ENV_CONTRACT.md`
- `.docs/ghost-ai/PRODUCTION_READINESS.md`
- `.docs/ghost-ai/DEPLOYMENT_CHECKLIST.md`

Long reference docs remain useful, but should be read as pre-pivot context:

- `.docs/legacy/realestate-vertical-blueprint.md`
- `.docs/legacy/evolution-blueprint.md`
- `SSMA.md`
- `.docs/legacy/revenue-engines.md`

## Local Setup

Always work from the canonical path:

```bash
cd /Users/rohit/Projects/whatsai-assistant
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
pm2 stop whatsai-sales-agent whatsai-tool-gateway whatsai-summoner
```

Run the complete WhatsAI readiness proof:

```bash
npm run prove:whatsai
```

This checks required env, PM2 health on ports `8080`, `8081`, `8082`, WhatsApp webhook verification, and Supabase `conversation_threads`.

Run the deterministic reply release gate:

```bash
npm run prove:keyword-engine
```

This proves tenant isolation for overlapping keywords, exact replies, fallback handoff, manual takeover suppression, unified Summoner routing, and Tool Gateway sending.

## Current Build Rule

Supabase `assistant_playbooks` is the only source of truth for live keyword replies. Vertical templates are copied into onboarding and saved to the tenant playbook; agents must never load business reply text from source files.

## Launch Blockers

Launch blockers for the current WhatsAI MVP are only:

- Supabase env and canonical conversation tables are not reachable.
- The three active PM2 agents are not online: sales-agent, tool-gateway, summoner.
- WhatsApp Cloud API token or verify token is missing/invalid.
- Public webhook verification cannot return `200`.

Razorpay, content generation, colony management, finance workflows, OpenAI content, and advanced Meta Ads are deferred modules. They are not blockers for the WhatsAI lead-to-appointment MVP.
