# X7 WhatsAI Assistant — Codex God Prompt & Handoff

**Context:** You are taking over development of the `x7-realestate-os` repository. We have successfully pivoted the codebase from a "builder-only Real Estate OS" into **X7 WhatsAI Assistant** — a horizontal WhatsApp-first AI platform for Indian SMBs. 

Your job is to read this handoff document, align yourself with the pivot strategy, and continue executing from **Phase 6: Production Proof**.

---

## 1. The Pivot Strategy
- **Core Thesis:** Indian SMBs run their businesses on WhatsApp. They don't need complex SaaS dashboards initially; they need a 24/7 AI WhatsApp receptionist to qualify leads, book appointments, and alert them (handoff) when a lead is hot.
- **The Wedge:** A 7-day managed WhatsApp assistant trial.
- **Architecture Strategy (The Non-Rebuild Rule):** Do NOT rebuild from scratch. We are keeping the existing real estate sales engine, webhook paths, and Summoner orchestration. We have built a **generic business/playbook layer** on top of the old real-estate layer. Real estate is simply our first vertical pack (`SiteVisit AI`), and we have added other vertical playbooks.

## 2. What Has Been Built (Phases 1-5 Complete)
We have successfully completed all architecture setup for the pivot:

1. **Phase 1: Generic Core Layer**
   - Added `businesses`, `business_profiles`, `business_channels`, `assistant_playbooks`, `conversation_contacts`, `conversation_threads`, `conversation_messages`, `lead_qualification_answers`, `handoff_events` tables via `009_generic_core_layer.sql`.
   - Setup generic Row Level Security (RLS) policies in `010_generic_rls_policies.sql`.
2. **Phase 2: WhatsApp Assistant Gateway**
   - Generalised the WhatsApp ingress logic in `agents/x7-re-summoner/index.js` to route messages based on `business_channels`.
3. **Phase 3: Trial Console**
   - Standardised `assistant-contract.js` in the `sales-agent` to enforce strict response types (`answer`, `ask_qualification`, `handoff`).
   - Created Trial Console dashboard pages for `Trials`, `Conversations`, `Handoffs`, and `Summaries`.
4. **Phase 4: Vertical Playbooks**
   - Created `agents/x7-re-sales-agent/vertical-playbooks.js` configuring 5 verticals: `real_estate`, `clinic`, `coaching`, `gym`, `local_service`.
   - Exposed a stateless `/playbook/qualify` generic endpoint to handle conversational state and qualification across verticals.
5. **Phase 5: Revenue Features**
   - Created `011_revenue_billing.sql` establishing subscription plans, invoices, usage tracking, and white-label setup checklists.
   - Built usage limit gates and trial expiry cron jobs directly into the Summoner.
   - Rebuilt the Dashboard Settings page to act as a Billing/Setup hub.

## 3. The Architecture Right Now
- **Summoner (`agents/x7-re-summoner/index.js`):** Receives inbound webhooks from Meta. Resolves the generic `businessId` and active `playbook`. For real estate, it currently routes legacy logic (until deprecated); for everything else, it hits `/playbook/qualify` on the sales agent.
- **Sales Agent (`agents/x7-re-sales-agent/index.js`):** Acts as the primary conversational brain. Evaluates user intent, asks the next playbook question, records qualification answers in Supabase (`lead_qualification_answers`), and decides when to trigger a handoff event.
- **Dashboard (`apps/dashboard`):** Built in Next.js 14 App Router. Displays leads, handoffs, billing, and operator views.

## 4. Current Status: 100% Code Complete, Blocked on Live Proof (Phase 6)
**Conversion Status:** We have converted **100%** of the core codebase for the MVP (Phases 1 through 5 are completely built). 

However, **Phase 6: Production Proof** was partially executed and is currently blocked by environment configuration issues.

**What was successfully verified locally:**
- `sales-agent` and `summoner` health checks pass (`200 OK`).
- Direct generic playbook endpoints passed (e.g., `clinic` returned `ask_qualification`, `coaching` hot lead returned `handoff`).
- Signed Meta webhook simulation successfully reached Summoner.
- Production safety fixes (timeouts, circuit breakers) are implemented.

**What is BLOCKED (Your First Task):**
- Live Supabase write/migration proof failed because the DNS cannot resolve (`yxiniazontslpivaoxfb.supabase.co`).
- Because Supabase cannot resolve, we could not honestly prove: migrations 009/010/011, message persistence, qualification saving, or DB-backed routing.
- The webhook circuit breaker fallback triggered a `401 Authentication Error` from the Graph API, meaning the Meta WhatsApp token is invalid/expired.

**Your Immediate Next Steps:**
1. **Frontend Rebranding (Priority):** We are currently blocked on the Meta WhatsApp Token for Phase 6. So your FIRST task is to update the frontend UI. Search the `apps/dashboard` and `apps/landing` directories for "RealEstate OS" or real estate specific jargon and rename the branding to **"X7 WhatsAI Assistant"** to reflect the new horizontal platform.
2. **Phase 6 Proof (Once Meta Token is provided):** When the user provides the new Meta WhatsApp Token and Supabase credentials, run `node scripts/setup-phase6-env.js` to automatically update all `.env` files.
3. **Apply Migrations:** Run Supabase migrations (`009`, `010`, `011`) against the new live project.
4. **Rerun Phase 6 Proof:** Run `./scripts/start-phase6-local.sh` and re-verify the full end-to-end webhook-to-database-to-outbound-message flow.


## 5. Rules of Engagement
1. **Never break existing real estate flows.** The original real estate routes must coexist until the generic layer achieves 100% parity and verification.
2. **Consult documentation.** `X7_WhatsAI_Pivot_Strategy.md` and `.docs/ghost-ai/NEXT_BUILD_PLAN.md` are your north star documents.
3. **Keep it simple.** Do not over-engineer features not strictly required for the first 10 SMB trials.
4. **Focus on the wedge.** We are selling a 24/7 WhatsApp receptionist. Do not introduce complex multi-agent jargon to the frontend.

---
**Ready to begin.** Please start by executing Phase 6 (Production Proof).
