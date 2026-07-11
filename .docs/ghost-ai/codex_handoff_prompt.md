# WhatsAI Assistant — Frontend Pivot God Prompt (10 Phases)

## Context for Codex

You are a **senior full-stack engineer** working on `whatsai-assistant`.
The product has been pivoted from "WhatsAI Assistant" to **WhatsAI Assistant** — a 24/7 WhatsApp AI receptionist for Indian SMBs.

**Backend is 100% complete.** All database tables, agent endpoints, and playbook logic are production-ready.

Your job is **frontend-only**: convert the dashboard UI from a real-estate-first product into a clear WhatsApp AI Assistant experience. Do NOT break backend routes. Do NOT delete any route or file — only change UI copy, layout, and components.

**Tech stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide React.
**Key path:** `apps/dashboard/src/`

**Non-negotiable rules:**
1. Never delete a route or backend call.
2. Use `demo fallback` pattern: if Supabase returns empty/error, show realistic demo data so the page is always useful.
3. Keep Hindi bilingual labels (`labelHi`) in sidebar and page headers.
4. Run `npm run type-check` after each phase. Fix all TS errors before moving to next phase.
5. Keep components small and reusable. If a component > 150 lines, split it.

---

## Phase 1 — Dashboard Homepage: WhatsAI Command Center

**File:** `apps/dashboard/src/components/dashboard/DashboardHomePage.tsx`

**Current problem:** The page has real-estate cards like "Revenue Pulse", "Meta Ads leads", "Source Quality Snapshot". These make no sense for a generic WhatsApp AI platform.

**What to build:**
Replace the existing cards with a WhatsApp-first command center layout:

### KPI Strip (top row — 5 cards)
| Card | Icon | Demo Value |
|---|---|---|
| WhatsApp Messages Today | `MessageSquare` | 24 |
| Qualified Leads | `CheckCircle` | 8 |
| Hot Handoffs | `Handshake` | 2 |
| Appointments Booked | `CalendarCheck` | 3 |
| Trial Status | `Zap` | "Day 3 of 7" |

### Live Flow Section (middle)
Show a live activity feed titled **"Today's AI Activity"** with entries like:
- `[10:32 AM]` Aditya Sharma asked about flat in Super Corridor — **AI replied in 4s**
- `[10:45 AM]` Dr. Meena Joshi booked appointment for Saturday — **Handoff sent to owner**
- `[11:02 AM]` Rohit enquired about coaching fee — **Qualification Step 3/5**

Each item has:
- Timestamp
- Customer name (bold)
- Short AI action description
- A status badge: `replied` | `handoff` | `qualifying` | `appointment`

### Agent Status Row (bottom)
Keep the existing `AgentRow` component but update the agents listed:
- WhatsApp Receptionist → active
- Qualification Engine → active
- Handoff Monitor → active
- Follow-up Queue → idle (if no pending)
- Trial Usage Watch → idle

**Demo data pattern:**
```typescript
const DEMO_ACTIVITY = [
  { time: '10:32 AM', name: 'Aditya Sharma', action: 'Asked about 2BHK — AI replied in 4s', status: 'replied' },
  { time: '10:45 AM', name: 'Dr. Meena Joshi', action: 'Appointment booked for Saturday', status: 'handoff' },
  { time: '11:02 AM', name: 'Rohit Verma', action: 'Coaching fee enquiry — Step 3/5', status: 'qualifying' },
];
```

**Prompt for Codex:**
```
Rewrite DashboardHomePage.tsx as a WhatsApp AI Receptionist command center.
Top row: 5 KPI cards — Messages Today, Qualified Leads, Hot Handoffs, Appointments Booked, Trial Status.
Middle: "Today's AI Activity" feed with timestamp, customer name, action, and status badge (replied/handoff/qualifying/appointment).
Bottom: Agent Status row (WhatsApp Receptionist, Qualification Engine, Handoff Monitor, Follow-up Queue, Trial Usage Watch).
Use demo fallback data. Keep existing KPICard, Card, Badge imports. Remove all real-estate-specific copy (Meta Ads, Revenue Pulse, Source Quality). Run type-check after.
```

---

## Phase 2 — Sidebar Navigation Restructure

**File:** `apps/dashboard/src/components/shared/Sidebar.tsx`

**Current state:** Sidebar already has WhatsAI section and SiteVisit AI pack section. But "Tools" section shows Ghost Closer, Colony, Content, Campaigns — these are confusing for an SMB trial customer.

**New sidebar structure:**

```
Section: WhatsAI Assistant
  - Dashboard (/)
  - Conversations (/conversations)
  - Qualified Leads (/leads)
  - Handoffs (/handoffs)
  - Appointments (/site-visits)
  - Daily Summary (/summaries)

Section: Setup
  - Playbook Setup (/playbooks)   ← NEW route (page to be built in Phase 6)
  - Business Profile (/settings?tab=profile)
  - Billing / Trial (/settings?tab=billing)

Section: SiteVisit AI Pack (collapsible or secondary)
  - Bookings (/bookings)
  - Trials (/trials)

Section: Advanced (collapsed by default or hidden on trial plan)
  - Content (/content)
  - Campaigns (/campaigns)
  - Ghost Closer (/ghost-closer)
  - Colony (/colony)
  - Reports (/reports)
  - Settings (/settings)
```

**New icons to add:**
- `PlaySquare` or `BookOpen` for Playbook Setup
- `CalendarCheck` for Appointments
- `UserCheck` for Qualified Leads

**Prompt for Codex:**
```
Restructure Sidebar.tsx for WhatsAI Assistant.
Primary section "WhatsAI Assistant": Dashboard, Conversations, Qualified Leads, Handoffs, Appointments, Daily Summary.
Secondary section "Setup": Playbook Setup (/playbooks), Business Profile (/settings?tab=profile), Billing/Trial (/settings?tab=billing).
Tertiary section "SiteVisit AI Pack": Bookings, Trials.
Advanced section (collapsed/secondary): Content, Campaigns, Ghost Closer, Colony, Reports, Settings.
Do not delete any href. Use new Lucide icons. Keep Hindi labelHi on each item. Run type-check after.
```

---

## Phase 3 — Conversations Page

**File:** `apps/dashboard/src/app/(dashboard)/conversations/page.tsx`

**Tables used:** `conversation_contacts`, `conversation_threads`, `conversation_messages`, `lead_qualification_answers`

**What to build:**

Split layout (2 columns on desktop, stacked on mobile):

**Left panel — Contact List:**
- Each row: Avatar (initials), Name, Phone, Last message preview, Time, Status badge (hot/warm/cold/new)
- Click to select and show thread on right
- Search bar at top

**Right panel — Thread View:**
- Contact header: Name, Phone, Playbook vertical badge (Real Estate / Clinic / Coaching etc.)
- Message timeline (bubbles): customer messages left (grey), AI replies right (primary color)
- Below timeline: Qualification Answers summary card (key: value pairs)
- Bottom: "Mark Handoff" button + "Add Note" button

**Demo fallback data:**
```typescript
const DEMO_CONTACTS = [
  { id: '1', name: 'Aditya Sharma', phone: '+91 98765 43210', lastMsg: 'Mujhe 2BHK chahiye Super Corridor mein', time: '10:32 AM', status: 'hot' },
  { id: '2', name: 'Dr. Meena Joshi', phone: '+91 87654 32109', lastMsg: 'Saturday morning slot available hai?', time: '10:45 AM', status: 'warm' },
];
```

**Prompt for Codex:**
```
Build a full Conversations page at /conversations for WhatsAI Assistant.
Two-column layout: left = WhatsApp contact list with search, status badges (hot/warm/cold/new), last message preview. Right = selected thread with message bubbles (customer left, AI right), qualification answers summary, Mark Handoff button.
Read from conversation_contacts, conversation_threads, conversation_messages tables via Supabase. Use demo fallback if empty. Run type-check after.
```

---

## Phase 4 — Qualified Leads Page

**File:** `apps/dashboard/src/app/(dashboard)/leads/page.tsx`

**Current problem:** This page is real-estate centric. It shows builder-specific lead fields (project name, booking intent etc.).

**New generic model — what to show per lead:**

| Field | Source |
|---|---|
| Name / Phone | `conversation_contacts` |
| Business Vertical | from `assistant_playbooks.vertical` |
| Need / Problem | from `lead_qualification_answers` key `need` or first answer |
| Budget / Urgency | from qualification answers |
| Appointment Intent | `has_appointment_request` boolean |
| AI Summary | last outbound AI message |
| Qualification Score | count of answers completed / total questions |
| Status | hot / warm / cold (from thread status) |
| Next Action | Handoff / Follow-up / Appointment |

**Layout:** Table view on desktop, card view on mobile. Filter by vertical and status.

**Prompt for Codex:**
```
Convert the Leads page into a generic "Qualified Leads" page for WhatsAI Assistant.
Show name, phone, vertical, need/problem, budget/urgency, appointment intent, qualification score, AI summary, status, next action.
Read from conversation_contacts joined with lead_qualification_answers and conversation_threads. Use demo fallback. Remove all real-estate-specific labels (project, booking, property type) from the visible UI. Keep underlying data intact. Run type-check after.
```

---

## Phase 5 — Handoffs Page

**File:** `apps/dashboard/src/app/(dashboard)/handoffs/page.tsx`

**Table used:** `handoff_events`

**Handoff event schema:**
```typescript
{
  id: string
  business_id: string
  thread_id: string
  contact_id: string
  reason: string           // 'hot_lead' | 'payment_intent' | 'appointment_request' | 'human_requested' | 'urgent_callback' | 'complaint'
  ai_summary: string
  suggested_action: string
  status: 'new' | 'acknowledged' | 'done'
  created_at: string
}
```

**What to show per handoff:**
- Customer name + phone (join with contacts)
- Reason badge (color coded: red=urgent, amber=warm, green=appointment)
- AI summary text
- Suggested owner action
- Conversation link (→ go to /conversations?thread=X)
- Status dropdown: New → Acknowledged → Done
- Time since handoff

**Layout:** Cards or table. Filter by status. Highlight "New" handoffs prominently.

**Prompt for Codex:**
```
Build a Handoffs page backed by handoff_events table. Show customer name/phone, reason (color-coded badge), AI summary, suggested owner action, conversation link, status (New/Acknowledged/Done), and time since handoff.
Highlight New handoffs prominently. Allow status update. Use demo fallback. Run type-check after.
```

---

## Phase 6 — Playbook Setup Page

**File:** `apps/dashboard/src/app/(dashboard)/playbooks/page.tsx` ← NEW FILE

**Source of truth for default templates:** `agents/x7-re-sales-agent/vertical-playbooks.js`

**5 verticals available:**
1. `real_estate` — SiteVisit AI
2. `clinic` — Appointment AI
3. `coaching` — Admission AI
4. `gym` — Fitness Intake AI
5. `local_service` — Callback AI

**What to build:**

**Step 1 — Vertical Selector:**
5 cards, each showing the vertical name, icon, and a one-line description. Click to select.

**Step 2 — Question Editor:**
After selection, show the qualification questions for that vertical in an editable list:
- Each question: text, key, required toggle, order number
- Add question button
- Delete question button (with confirmation)

**Step 3 — Handoff Rules:**
- Handoff triggers: keywords list (editable)
- Minimum answers before handoff (number input)
- Safety override toggle (for clinic: "Never diagnose / prescribe")

**Step 4 — Save:**
Write to `assistant_playbooks` table in Supabase.
`POST /api/playbooks/save` (create this Next.js API route too)

**Prompt for Codex:**
```
Create a new Playbook Setup page at /playbooks for WhatsAI Assistant.
Step 1: Vertical selector (real_estate, clinic, coaching, gym, local_service) with icons.
Step 2: Editable qualification questions list for selected vertical (use vertical-playbooks.js as defaults).
Step 3: Handoff rules (trigger keywords, min answers, safety override for clinic).
Step 4: Save to assistant_playbooks Supabase table via POST /api/playbooks/save API route.
Create the page file and the API route. Run type-check after.
```

---

## Phase 7 — Business Setup Wizard

**File:** `apps/dashboard/src/app/(dashboard)/setup/page.tsx` ← NEW FILE

**Purpose:** First-time onboarding for a new trial business.

**Wizard Steps (4 steps):**

**Step 1 — Business Basics:**
- Business Name
- Category (dropdown: real_estate / clinic / coaching / gym / local_service)
- City
- Owner Name
- Owner Phone (for handoffs)

**Step 2 — WhatsApp Setup:**
- WhatsApp Business Number
- Business Hours (Mon-Sun, start/end time)
- Welcome Message (editable)

**Step 3 — Services / FAQs:**
- Services/Products list (add/remove chips)
- Pricing range (text)
- FAQ list (question + answer pairs, add/remove)

**Step 4 — Confirm & Launch:**
- Summary of all inputs
- "Launch Trial" button
- Writes to: `businesses`, `business_profiles`, `business_channels`
- Also calls `seed_setup_checklist(business_id)` Supabase function

**Prompt for Codex:**
```
Build a 4-step Business Setup Wizard at /setup for WhatsAI Assistant.
Step 1: Business name, category, city, owner name, owner phone.
Step 2: WhatsApp number, business hours, welcome message.
Step 3: Services list, pricing range, FAQ pairs (add/remove).
Step 4: Summary and "Launch Trial" button.
On submit: write to businesses, business_profiles, business_channels tables. Call seed_setup_checklist Supabase function. Run type-check after.
```

---

## Phase 8 — WhatsApp Gateway Production Audit

**Files to audit:**
- `agents/x7-re-summoner/index.js`
- `agents/x7-re-sales-agent/index.js`
- `agents/x7-re-tool-gateway/index.js`

**Checklist to verify and fix:**

1. **Webhook GET verification** — WHATSAPP_VERIFY_TOKEN check is correct
2. **Webhook POST signature** — X-Hub-Signature-256 validated
3. **Business channel resolution** — `findBusinessByChannel(channelId)` works, fallback to DEFAULT_BUSINESS_ID
4. **Message persistence** — inbound saved to `conversation_messages` direction='inbound'
5. **Summoner routing** — non-real-estate → `/playbook/qualify`, real-estate → legacy
6. **Timeout fallback** — 10s circuit breaker active, logs `handler_timeout`
7. **Outbound reply** — Tool Gateway `/whatsapp/send` correctly calls Meta Graph API
8. **Token error logging** — `401` / `OAuthException` caught and logged clearly
9. **Health endpoint** — `GET /health` returns `{ ok: true, service, supabase, whatsapp }` status
10. **Usage tracking** — each inbound/outbound message updates `business_usage` table

**Prompt for Codex:**
```
Audit the WhatsApp Cloud API ingress path across summoner, sales-agent, and tool-gateway.
Verify and fix: webhook GET/POST verification, business channel resolution, conversation persistence, Summoner routing, 10s timeout fallback, outbound Meta Graph reply, token error logging, health endpoint, usage tracking writes.
Add clear structured logs (JSON) for every step. Run `node --check index.js` on all three agents after.
```

---

## Phase 9 — Trial Console / Billing Rebuild

**File:** `apps/dashboard/src/app/(dashboard)/settings/page.tsx`

**Current state:** Settings page was rebuilt in Phase 5 with 4-plan pricing grid and setup checklist. Good foundation, needs real data wiring.

**What to add/fix:**

**Trial Status Card (new, prominent):**
- Trial day counter: "Day 3 of 7"
- Progress bar
- Messages used today vs limit
- Qualified leads this week
- Handoffs generated

**Data source:** `business_subscriptions` + `business_usage` tables

**Setup Checklist (wire to real data):**
- Currently shows static list. Wire to `business_setup_checklist` table.
- Allow checking off steps (PATCH to Supabase).
- Show completion percentage.

**Billing section:** Keep existing 4-plan pricing grid. Add "Contact us to upgrade" CTA that opens WhatsApp with a pre-filled message to owner.

**Prompt for Codex:**
```
Upgrade the Settings/Billing page to a live Trial Console.
Add a Trial Status card showing day count, progress bar, messages used, qualified leads, handoffs.
Wire the Setup Checklist to business_setup_checklist Supabase table with real checkoff ability.
Add "Contact us to upgrade" CTA on billing plans that opens WhatsApp with pre-filled message.
Read from business_subscriptions and business_usage. Demo fallback if empty. Run type-check after.
```

---

## Phase 10 — Public Landing Page

**File:** `apps/landing/` (separate Next.js app)

**Purpose:** Public URL to send to potential trial SMB customers.

**Hero Section:**
- Headline: **"WhatsAI Assistant"**
- Subheadline: **"24/7 WhatsApp receptionist for Indian businesses. Never miss a customer again."**
- Hindi line: **"Aapka business sote waqt bhi leads qualify karta rahe."**
- CTA button: "Start 7-Day Free Trial →" (opens a WhatsApp link or form)

**How It Works Section (3 steps):**
1. Customer sends WhatsApp message → AI replies in seconds
2. AI asks right questions → Qualifies the lead
3. Hot lead? → Owner gets instant alert

**Example Chat Section:**
Show a simulated WhatsApp conversation UI:
- Customer: "Hello, mujhe 2BHK chahiye Super Corridor mein"
- AI: "Namaste! Budget kitna hai aapka?"
- Customer: "50 lakh tak"
- AI: "Perfect! Kab tak lena chahte hain? Is month?"
- Customer: "Haan, jaldi chahiye"
- AI: "Ek moment — main aapka visit schedule kar deta hu. Owner se directly baat karna chahenge?"

**Verticals Section (5 cards):**
Real Estate / Clinic / Coaching / Gym / Local Services — each with a one-line promise.

**Pricing Section:**
Trial (₹999/7 days) → Basic (₹2,999/mo) → Growth (₹7,999/mo) → Pro (₹14,999/mo)

**Footer CTA:**
"Start your 7-day trial today. Setup in 10 minutes. No app download."

**Prompt for Codex:**
```
Build a public landing page for WhatsAI Assistant in the apps/landing directory.
Sections: Hero (headline, Hindi subline, CTA), How It Works (3 steps), Example WhatsApp Chat (simulated bubble UI), Business Verticals (5 cards), Pricing (4 tiers), Footer CTA.
Design should feel modern, mobile-first, and trustworthy for Indian SMB owners. Use Tailwind CSS. No dashboard auth required. Run type-check after.
```

---

## Execution Order

Execute STRICTLY in this order. Complete each phase before starting next:

1. **Phase 1** — Dashboard homepage (fastest win, sets the product tone)
2. **Phase 2** — Sidebar navigation (makes product feel organized)
3. **Phase 3** — Conversations page (the product's heart)
4. **Phase 5** — Handoffs page (second most important for owners)
5. **Phase 4** — Qualified Leads page (depends on conversations logic)
6. **Phase 6** — Playbook Setup (backend already exists)
7. **Phase 9** — Trial Console wire-up (billing already scaffolded)
8. **Phase 7** — Business Setup Wizard (onboarding flow)
9. **Phase 8** — WhatsApp Gateway audit (backend hardening)
10. **Phase 10** — Public landing page (last, needs all other pages to be stable)

---

## Key Files Reference

| What | Path |
|---|---|
| Dashboard root page | `apps/dashboard/src/app/(dashboard)/page.tsx` |
| DashboardHomePage component | `apps/dashboard/src/components/dashboard/DashboardHomePage.tsx` |
| Sidebar | `apps/dashboard/src/components/shared/Sidebar.tsx` |
| Constants (APP_NAME etc.) | `apps/dashboard/src/lib/constants.ts` |
| Conversations page | `apps/dashboard/src/app/(dashboard)/conversations/page.tsx` |
| Leads page | `apps/dashboard/src/app/(dashboard)/leads/page.tsx` |
| Handoffs page | `apps/dashboard/src/app/(dashboard)/handoffs/page.tsx` |
| Settings page | `apps/dashboard/src/app/(dashboard)/settings/page.tsx` |
| Summaries page | `apps/dashboard/src/app/(dashboard)/summaries/page.tsx` |
| Trials page | `apps/dashboard/src/app/(dashboard)/trials/page.tsx` |
| Vertical playbooks config | `agents/x7-re-sales-agent/vertical-playbooks.js` |
| Supabase migrations | `supabase/migrations/` |
| Start agents script | `scripts/start-phase6-local.sh` |
| Env setup script | `scripts/setup-phase6-env.js` |

---

## Current Status Before You Start

| Layer | Status |
|---|---|
| Database schema (Supabase) | ✅ Live (migrations 009, 010, 011 applied) |
| Summoner webhook routing | ✅ Code complete + tested locally |
| Sales Agent playbook engine | ✅ Code complete + tested locally |
| Revenue/billing backend | ✅ Code complete |
| WhatsApp outbound send | ⚠️ Blocked (Meta token expired) |
| Dashboard homepage | ⚠️ Needs WhatsAI rewrite |
| Sidebar navigation | ⚠️ Partially done, needs polish |
| Conversations page | ⚠️ Exists but needs full rebuild |
| Handoffs page | ⚠️ Exists but needs polish |
| Leads page | ⚠️ Real estate centric, needs generic pivot |
| Playbook Setup UI | ❌ Not built |
| Business Setup Wizard | ❌ Not built |
| Public landing page | ❌ Not built |

---

**Start with Phase 1. Read DashboardHomePage.tsx first, then rewrite it. Run type-check. Commit. Report back.**
