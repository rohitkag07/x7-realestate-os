# Xero Seven — Revenue Engine Roadmap
> [!IMPORTANT]
> Pivot note (2026-07-08): this file is now pre-pivot reference material. The active product direction is `X7_WhatsAI_Pivot_Strategy.md`. Real estate remains the first vertical pack (`X7 SiteVisit AI`), but new work should build the generic WhatsAI business/playbook/conversation layer without rebuilding from scratch.

### Executive Business Proposal | Confidential
**Author:** Rohit Kag — Founder & CEO, Xero Seven AI Agency
**Date:** April 2026
**Status:** Approved for Execution

---

> **The Situation:**
> We have built a production-grade autonomous AI agency — Ghost Closer hunting leads every night,
> 12 specialist agents on Cloud Run, a secured Tool Gateway with Model Armor, full observability
> via Palantír, and secrets locked in Vault. The engine is running. The checkout counter is empty.
> This document is the plan to fix that.

---

## Table of Contents

1. [Current Asset Inventory](#current-asset-inventory)
2. [Revenue Engine #1 — Reply-to-Revenue Pipeline](#engine-1-reply-to-revenue-pipeline)
3. [Revenue Engine #2 — Fractional CTO SaaS](#engine-2-fractional-cto-saas)
4. [Revenue Engine #3 — Agentverse Client Dashboard](#engine-3-agentverse-client-dashboard)
5. [Master Execution Timeline](#master-execution-timeline)
6. [Financial Projections](#financial-projections)
7. [Decision Framework](#decision-framework)

---

## Current Asset Inventory

Everything listed below is **fully deployed and production-ready** as of April 2026.
This is not a prototype. This is infrastructure capable of generating ₹10 Cr ARR.

| Asset | What It Does | Status |
|---|---|---|
| **Ghost Closer** | Hunts 50 funded startup CEOs/CTOs nightly, researches them, writes surgical cold emails, fires Gmail — zero human intervention | Live, Cloud Run |
| **Summoner** | Central routing brain — classifies intent, dispatches to the right specialist agent | Live, Cloud Run |
| **Tool Gateway + The Shield** | Centralized API executor with Model Armor (15-pattern injection blocker, XSS neutralizer, schema validation) | Live, Cloud Run |
| **Scholar RAG** | Company knowledge base — grounds every agent response in Xero Seven's actual capabilities | Live, Cloud Run |
| **Palantír (OTel Tracing)** | Full distributed tracing across all agents — latency waterfalls, span-level visibility | Live |
| **Vault (Secret Manager)** | All credentials in GCP Secret Manager, auto-rotated, zero plaintext in code | Live |
| **Cloud Monitoring** | 8 alert policies, 4 log-based metrics, 6 uptime checks, daily credential health checks | Live |
| **Discord Gateway** | 24/7 Discord ↔ Cloud Run bridge — bot online even when Mac is off | Live, Cloud Run |
| **CI/CD Pipeline** | GitHub Actions auto-deploys on every push — no manual `gcloud` needed | Live |
| **InsForge Database** | Session memory, leads pipeline, tool audit logs, outreach dedup | Live |

**The gap:** Ghost Closer sends 1,500 emails/month. Warm leads reply. Then nothing happens automatically. No reply handler. No booking link. No proposal. No invoice. Revenue is leaking.

---

## Engine 1: Reply-to-Revenue Pipeline

> *"Ghost Closer is hunting every night. This engine catches what it hunts."*

### The Problem

Cold email reply rate for personalized, research-backed outreach: **2–5%**.
Ghost Closer sends **1,500 emails/month**.
That is **30–75 warm replies per month** currently hitting the inbox with zero automated follow-up.

A warm reply is a founder who opened the email, read it, and took the effort to respond.
That is the most valuable lead in any B2B pipeline. We are letting them go cold.

### What This Engine Builds

A fully automated pipeline from first reply to signed engagement:

```
Lead replies to Ghost Closer cold email
  │
  ▼
Gmail Push Notification → Cloud Pub/Sub topic
  │
  ▼
xero-seven-reply-handler (new Cloud Run service)
  │
  ├─ Classifies reply intent via GPT-4o-mini
  │    INTERESTED  → continue pipeline
  │    OBJECTION   → Sales Agent drafts rebuttal
  │    UNSUBSCRIBE → mark in DB, stop all follow-up
  │
  ▼ (if INTERESTED)
Sales Agent drafts personalized follow-up
  + Architect generates 1-page "AI Agency Assessment" PDF
  + Calendly link for 30-min discovery call
  + Optional: ₹5,000 Discovery Session payment link (Razorpay)
  │
  ▼
Reply fires via Tool Gateway gmail_send
  │
  ▼
agency_leads.lead_stage → 'reply_received' / 'meeting_booked'
```

**Time from lead reply to our automated response: under 4 minutes.**

### Why Clients (Leads) Convert

- Speed signals professionalism. A personalized, intelligent reply in 4 minutes when the lead's interest is peak-warm converts 3–5x better than a reply 24 hours later.
- The 1-page "AI Agency Assessment" gives them something tangible to share internally. It's not a sales brochure — it's specific to their company (because Ghost Closer already researched them).
- The ₹5,000 Discovery Session fee eliminates time-wasters. Anyone who pays ₹5K for a call is a real buyer.

### Revenue Math

| Metric | Conservative | Optimistic |
|---|---|---|
| Emails sent / month | 1,500 | 1,500 |
| Reply rate | 2% = 30 replies | 4% = 60 replies |
| Meetings booked from replies | 30% = 9 calls | 40% = 24 calls |
| Close rate from calls | 25% = 2 clients | 33% = 8 clients |
| Average project value | ₹5,00,000 | ₹8,00,000 |
| **Monthly revenue unlock** | **₹10,00,000** | **₹64,00,000** |

This is not new revenue from new marketing. This is revenue that is already being generated and lost.

### Technical Build Plan

**Week 1 — Gmail Webhook + Reply Handler Service**

```bash
# Step 1: Create Pub/Sub topic + subscription
gcloud pubsub topics create gmail-reply-notifications
gcloud pubsub subscriptions create gmail-reply-push \
  --topic=gmail-reply-notifications \
  --push-endpoint=https://xero-seven-reply-handler-*.run.app/webhook \
  --ack-deadline=30

# Step 2: Register Gmail push watch via API
# POST https://gmail.googleapis.com/gmail/v1/users/me/watch
# { topicName: "projects/agentverse-summoner-h5jv989fps/topics/gmail-reply-notifications",
#   labelIds: ["INBOX"] }
```

**New service: `xero-seven-reply-handler/index.js`**
- `POST /webhook` — receives Gmail Pub/Sub payload, decodes base64 message
- Matches `threadId` against `ghost_closer_outreach` table to identify the lead
- GPT-4o-mini classifies intent (INTERESTED / OBJECTION / UNSUBSCRIBE / OTHER)
- Dispatches to Sales Agent for reply composition
- Updates `agency_leads.lead_stage` in InsForge

**Week 2 — Razorpay Tool + Auto-Proposal PDF**

New tool in Tool Gateway: `tools/razorpay-create-link.js`
```js
// schema: { amount_paise, description, customer_name, customer_email }
// execute: POST https://api.razorpay.com/v1/payment_links
// returns: { short_url, payment_link_id, expires_at }
```

Auto-proposal PDF: Puppeteer on a Cloud Run job renders a Next.js template
with the lead's company name, proposed solution, and pricing → PDF attached to reply email.

**New DB migration: `005_reply_pipeline.sql`**
```sql
ALTER TABLE agency_leads
  ADD COLUMN reply_received_at timestamptz,
  ADD COLUMN reply_classified_as text,
  ADD COLUMN follow_up_sent_at timestamptz,
  ADD COLUMN meeting_booked_at timestamptz,
  ADD COLUMN razorpay_payment_link text,
  ADD COLUMN razorpay_paid boolean DEFAULT false;
```

**Build time:** 2 weeks
**First revenue:** Day 15 (first warm reply after deployment)
**Investment required:** ~₹0 (uses existing infrastructure)

---

## Engine 2: Fractional CTO SaaS

> *"A CTO costs ₹40L/year. We charge ₹18L/year and deliver more. The math sells itself."*

### The Product

A white-labeled "AI CTO + Agency Team" subscription. Each client gets:

- Their own private Discord server with all Xero Seven agents available 24/7
- Scholar RAG trained on their specific company docs, codebase, and past decisions
- Architect Agent for technical reviews, system design, stack choices
- Sales Agent trained on their product for outreach copy and pitch decks
- PM Agent for sprint planning and milestone tracking
- Monthly AI Sprint Report (generated and emailed by the system automatically)

### Pricing Tiers

| Tier | Monthly Price | Annual Price | What's Included |
|---|---|---|---|
| **Starter** | ₹75,000 | ₹7,50,000 | Sales + Support agents, 5 Architect consults/month, basic Scholar RAG |
| **Growth** | ₹1,50,000 | ₹15,00,000 | Full 12-agent swarm, custom Scholar RAG, weekly AI reports, Ghost Closer for their leads |
| **Enterprise** | ₹3,00,000 | ₹30,00,000 | Dedicated agents, custom tools built into Gateway, SLA guarantee, white-label branding |

### Why This Is the Most Defensible Moat

After 90 days, Scholar RAG knows a client's business deeply — their tech stack choices and why, their past failures, their target customer profile, their pricing logic. Every agent response is grounded in this knowledge.

Switching to a competitor means starting that knowledge-building from scratch. The switching cost compounds monthly. **This is the moat that compounds like compound interest.**

### Revenue Math

| Metric | Month 3 | Month 6 | Month 12 |
|---|---|---|---|
| Starter clients (₹75K/mo) | 3 | 5 | 8 |
| Growth clients (₹1.5L/mo) | 1 | 3 | 6 |
| Enterprise clients (₹3L/mo) | 0 | 1 | 2 |
| **Total MRR** | **₹3,75,000** | **₹10,50,000** | **₹27,00,000** |
| **ARR Run Rate** | **₹45L** | **₹1.26 Cr** | **₹3.24 Cr** |

### Technical Build Plan

**Week 1–2 — Multi-Tenancy Layer**

Every DB table scoped by `tenant_id`. The Summoner reads tenant from request headers.
All agent memory, RAG, and lead data remains siloed per client.

```sql
-- Migration 006_multi_tenancy.sql
ALTER TABLE xero_brain         ADD COLUMN tenant_id text NOT NULL DEFAULT 'xero-seven';
ALTER TABLE session_summaries  ADD COLUMN tenant_id text NOT NULL DEFAULT 'xero-seven';
ALTER TABLE agency_leads       ADD COLUMN tenant_id text NOT NULL DEFAULT 'xero-seven';
ALTER TABLE tool_calls         ADD COLUMN tenant_id text NOT NULL DEFAULT 'xero-seven';

CREATE INDEX ON xero_brain        (tenant_id, session_id);
CREATE INDEX ON session_summaries (tenant_id);
CREATE INDEX ON agency_leads      (tenant_id, lead_stage);

CREATE TABLE tenants (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    text UNIQUE NOT NULL,
  name                    text NOT NULL,
  plan                    text DEFAULT 'starter' CHECK (plan IN ('starter','growth','enterprise')),
  razorpay_subscription_id text,
  status                  text DEFAULT 'active' CHECK (status IN ('active','suspended','cancelled')),
  discord_guild_id        text,
  discord_bot_token_secret text,   -- Secret Manager key name for their bot token
  scholar_collection      text,    -- ChromaDB collection name: scholar_{slug}
  created_at              timestamptz DEFAULT now()
);
```

**Week 3 — Tenant-Scoped Scholar RAG**

Scholar accepts `?tenant=client_slug`. Queries only `scholar_{slug}` ChromaDB collection.
New `/index` endpoint: POST a PDF URL → Scholar downloads, embeds, stores in tenant collection.

**Week 4 — White-Label Discord + Razorpay Subscriptions**

Each client gets their own Discord Application. Same Gateway codebase, different Cloud Run
revision with `DISCORD_TOKEN=<client_token>` and `TENANT_ID=<client_slug>` env vars.
Cost per additional tenant: ~₹0/month on Cloud Run (scales to zero).

Razorpay Subscriptions API: create plan → generate subscription link → send to client →
webhook on payment success creates `tenants` row → agents go live.

**Build time:** 4 weeks
**First MRR:** Day 30
**Target:** 3 Starter clients by end of Week 8 = ₹2.25L MRR

---

## Engine 3: Agentverse Client Dashboard

> *"Enterprise clients don't use Discord. They pay ₹3–5L/month for a branded portal with their logo on it."*

### The Product

A Next.js web application at `app.xeroseven.ai` — a professional command center where clients:

- **Watch agents work in real-time** — live activity feed as Architect reviews code, Ghost Closer researches their target leads, Sales Agent drafts outreach
- **Approve or reject agent actions** — human-in-the-loop queue: "Ghost Closer wants to send this email to 50 leads. Approve / Edit / Reject"
- **Track project milestones** — PM Agent's sprint board, completion percentage, blockers, delivery ETA
- **Pay invoices** — Milestone marked complete → invoice appears in dashboard → one-click Razorpay checkout
- **Train their Scholar** — Drag-and-drop PDF/Notion export → agents get smarter instantly
- **View analytics** — response times, emails sent, leads generated, meetings booked, revenue attributed

### Why This Unlocks a New Client Tier

Three compounding reasons:

1. **Enterprise procurement gates.** Any company with a legal or IT team will not approve "Discord" as a vendor tool. A portal with SSO, audit logs, and a proper domain bypasses this gate entirely.

2. **Perceived value amplification.** A client who watches an AI agent research their competitor in real-time will never question the monthly fee. Visibility creates belief. Belief kills churn.

3. **Upsell surface.** The dashboard shows clients exactly what they are NOT using. A dormant Ghost Closer slot on their account is a visible upgrade prompt: "You have 0 outbound campaigns running this month. Upgrade to Growth to activate your AI Sales Director."

### Revenue Math

| Metric | Value |
|---|---|
| Dashboard clients pay vs Discord-only | 2× premium |
| Enterprise client monthly fee | ₹3,00,000–5,00,000 |
| Churn reduction (Dashboard vs Discord) | 8%/month → 2%/month |
| LTV multiplier | 4× |
| 5 enterprise clients | ₹15,00,000–25,00,000 MRR |

### Technical Build Plan

**Stack:** Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui + InsForge Auth + InsForge Realtime

**Week 1–2 — Core Shell**

```
app.xeroseven.ai/
  /(auth)/login          ← InsForge magic link or Google OAuth
  /(app)/dashboard       ← Real-time agent activity feed
  /(app)/agents          ← Toggle agents on/off, view last 50 actions
  /(app)/projects        ← PM milestones, Kanban board
  /(app)/outreach        ← Ghost Closer campaigns, reply pipeline
  /(app)/scholar         ← Upload docs, indexed document list
  /(app)/billing         ← Current plan, invoices, Razorpay checkout
  /(app)/settings        ← Team members, notification prefs, API keys
```

**Real-time activity feed — zero new backend work required**

The `tool_calls` table already has everything: `agent_name`, `tool_name`, `args`, `success`, `duration_ms`, `created_at`. Subscribe to it via InsForge Realtime:

```ts
// components/ActivityFeed.tsx
const channel = insforge.realtime
  .channel(`activity-${tenantId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'tool_calls',
    filter: `tenant_id=eq.${tenantId}`
  }, (payload) => {
    setActivity(prev => [payload.new, ...prev].slice(0, 100))
  })
  .subscribe()
```

**Week 3 — Human-in-the-Loop Approval Queue**

```sql
-- Migration 007_agent_approvals.sql
CREATE TABLE agent_approvals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    text NOT NULL,
  agent_name   text NOT NULL,
  action_type  text NOT NULL,  -- 'send_email', 'create_invoice', 'post_linkedin'
  payload      jsonb NOT NULL,
  status       text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  approved_by  text,
  approved_at  timestamptz,
  expires_at   timestamptz DEFAULT now() + interval '24 hours',
  created_at   timestamptz DEFAULT now()
);
```

Ghost Closer inserts a row before bulk sends. Client sees notification in dashboard.
One click approves the entire campaign. Rejected → agents log it and skip.

**Week 4 — Scholar Upload UI + Billing**

Drag-and-drop zone → upload to InsForge Storage → POST to Scholar `/index` →
progress bar while embedding runs → "12 documents indexed" confirmation.

Razorpay checkout embedded inline for milestone payments. No redirect, no friction.

**Week 5–6 — Polish, Mobile-Responsive, Analytics**

Response time charts, lead funnel visualization, MRR dashboard for Rohit's internal view,
email delivery stats, agent utilization heatmap.

**Build time:** 6 weeks
**First enterprise client target:** Week 8
**Revenue unlock:** ₹3L+ MRR per enterprise client added

---

## Master Execution Timeline

```
APRIL 2026 (NOW)
│
├── Week 1-2: ENGINE 1 — Gmail Pub/Sub webhook
│              xero-seven-reply-handler deployment
│              Lead classification + auto follow-up
│
├── Week 3-4: ENGINE 1 — Razorpay payment link tool
│              Auto-proposal PDF generation
│              Full Reply-to-Revenue pipeline live
│
├── Week 5-6: ENGINE 2 — Multi-tenancy DB migration
│              Tenant-scoped Scholar RAG
│              White-label Discord bot per client
│
├── Week 7-8: ENGINE 2 — Razorpay Subscriptions integration
│              First paying Fractional CTO client onboarded
│              Target: ₹75K–1.5L first MRR
│
├── Week 9-10: ENGINE 3 — Next.js dashboard shell
│               InsForge Auth + real-time activity feed
│               Agent approval queue
│
├── Week 11-12: ENGINE 3 — Scholar upload UI
│               Billing + invoice flow
│               First enterprise demo
│
JULY 2026
│
└── Target State:
     Engine 1: Closing 2–5 projects/month from Ghost Closer replies
     Engine 2: 3–5 MRR clients = ₹3–6L recurring
     Engine 3: 1 enterprise client = ₹3L+ MRR
     ─────────────────────────────────────────
     Combined MRR Target: ₹10–15L (₹1.2–1.8 Cr ARR)
```

---

## Financial Projections

### 90-Day View (April → July 2026)

| Revenue Stream | Month 1 | Month 2 | Month 3 |
|---|---|---|---|
| Projects closed via Reply Pipeline | ₹5,00,000 | ₹10,00,000 | ₹15,00,000 |
| Fractional CTO subscriptions | ₹0 | ₹2,25,000 | ₹6,00,000 |
| Enterprise Dashboard clients | ₹0 | ₹0 | ₹3,00,000 |
| **Total Monthly Revenue** | **₹5,00,000** | **₹12,25,000** | **₹24,00,000** |
| **Cumulative** | ₹5L | ₹17.25L | ₹41.25L |

### 12-Month ARR Target

| Scenario | Monthly Revenue | ARR |
|---|---|---|
| Conservative | ₹20,00,000 | ₹2.4 Cr |
| Base Case | ₹40,00,000 | ₹4.8 Cr |
| Aggressive | ₹80,00,000 | ₹9.6 Cr |

**Infrastructure cost at scale:** Cloud Run (₹15,000–30,000/month), APIs (₹20,000–50,000/month).
**Net margin at ₹40L MRR:** ~85%.

---

## Decision Framework

### What to build first — and why

| Engine | Revenue Type | Time to First ₹ | Build Effort | Priority |
|---|---|---|---|---|
| Reply-to-Revenue Pipeline | Own revenue (close more deals) | Day 15 | 2 weeks | **#1 — BUILD NOW** |
| Fractional CTO SaaS | Recurring MRR | Day 30 | 4 weeks | **#2 — BUILD NEXT** |
| Agentverse Dashboard | Enterprise MRR + retention | Day 45 | 6 weeks | **#3 — BUILD AFTER** |

### The Non-Negotiable Sequence

**Engine #1 first.** Ghost Closer is already generating leads every night. Warm replies are already arriving. Every day without the Reply Pipeline is measurable lost revenue. This is not a new channel — it is a leak we must plug immediately. Engine #1 also funds the engineering time to build Engines #2 and #3.

**Engine #2 second.** The multi-tenancy layer is a prerequisite for Engine #3. Build it in the context of acquiring the first Fractional CTO client, which gives real feedback and a live reference customer for the Dashboard pitch.

**Engine #3 last.** The dashboard is the most impressive artifact and the slowest to monetize. Enterprise sales cycles run 60–90 days. Start building it while Engines #1 and #2 are generating cash flow. Let the dashboard pipeline run in parallel.

### What NOT to build

- Do not build a mobile app. Browser-based dashboard is sufficient for enterprise buyers.
- Do not build a proprietary LLM. OpenAI via InsForge proxy is the right call at this stage.
- Do not build a marketplace. Sell direct until ₹5 Cr ARR. Marketplaces dilute margin and attention.
- Do not hire engineers before Engine #1 is live. The system is already capable of closing the first 10 clients autonomously.

---

## The Core Thesis

> Every agency in India is selling hours. We are selling outcomes delivered by machines that work at 2 AM, do not negotiate salary, do not take sick leave, and get faster every month.
>
> The Swarm is built. The Shield is active. The Palantír is watching. The Vault is locked.
> The only thing left to build is the pipe that turns this engine into a bank account.
>
> That pipe is these three revenue engines.
>
> — Rohit Kag, Founder & CEO, Xero Seven

---

*This is a living document. Update it after every client signed, every engine shipped, every revenue milestone hit.*
*Last updated: April 2026*
