# 🏢 SSMA — Smart Society Management App
> [!IMPORTANT]
> Pivot note (2026-07-08): this file is now pre-pivot reference material. The active product direction is `WHATSAI_PIVOT_STRATEGY.md`. Real estate remains the first vertical pack (`WhatsAI SiteVisit`), but new work should build the generic WhatsAI business/playbook/conversation layer without rebuilding from scratch.

### V1 Product Blueprint | India Market | Build-Ready Document
> **Author:** Rohit Kag — Founder, Xero Seven
> **Date:** May 2026
> **Status:** V1 BLUEPRINT — Ready for Build
> **Tech Stack:** Next.js + WhatsApp API + Supabase + Node.js Agents (X7 Backend)
> **Build Method:** Claude (Architecture) + Codex (Code Generation) — Step by Step

---

## THE CORE INSIGHT

> "Local builder ke liye ek simple app. Backend mein pura AI swarm."

The client (a local builder, RWA secretary, or housing society office) sees a **simple CRM dashboard** — flats list, complaints list, payments list. They don't need to know there are 5 AI agents running behind it.

The **killer feature** that sells this product: **Everything works over WhatsApp.**

- Resident sends "Lift kharab hai" on WhatsApp → Auto ticket created → Maintenance guy notified
- Secretary types "November maintenance bhejo" → AI generates & sends 200 invoices automatically
- Guard scans visitor QR → Resident gets WhatsApp alert → Approves with one tap

This is not a chatbot. This is a **Society Operating System delivered via WhatsApp.**

---

## SECTION 1: TARGET MARKET (INDIA-SPECIFIC)

### Who Buys This?

| Buyer Type | Description | Pain Point | Willingness to Pay |
|---|---|---|---|
| **Local Builder** | Built 50-200 flat complex, hands it to residents | Wants to look "premium" during handover | ₹5,000–₹15,000 setup + ₹3,000–₹8,000/month |
| **RWA Secretary** | Elected resident managing society manually | WhatsApp groups are chaotic, Excel is a mess | ₹2,000–₹5,000/month |
| **Property Management Company** | Manages 5-20 societies | Needs one dashboard for all properties | ₹15,000–₹40,000/month (multi-society) |
| **Mid-Size Housing Complex** | 100-500 flats, Tier 2/3 Indian cities | No full-time accountant, no IT staff | ₹4,000–₹10,000/month |

### Why WhatsApp Is the Killer Feature in India
- **500M+ WhatsApp users** in India — residents don't need to download any app
- Society secretaries already run everything on WhatsApp groups (badly)
- No app installation friction = zero adoption barrier
- Works on ₹5,000 Android phones in Tier 2/3 cities
- Seniors and non-tech residents can use it without training

### Why Local Builders Will Buy This
- "Smart Society" branding increases flat resale value perception
- Builder gives it as a "gift" during possession — monthly cost absorbed for Year 1
- Differentiator vs. competitors who still use Excel and paper registers

---

## SECTION 2: PRODUCT PHILOSOPHY — SIMPLE FRONT, POWERFUL BACK

### What the Client Sees (CRM Dashboard)
A clean, simple web dashboard with 4 core modules:
1. **Residents** — Flat-wise list, owner + tenant details, contact numbers
2. **Complaints** — Raised tickets, status tracking (Open/In Progress/Closed)
3. **Payments** — Monthly maintenance dues, payment status, overdue alerts
4. **Notices** — Broadcast messages sent to all or select residents

**That's it. No complexity. No AI jargon. Pure CRM.**

### What Runs Behind (X7 Multi-Agent Backend)
The WhatsApp number is the magic. Every WhatsApp interaction is handled by specialized agents:

| Agent Name | Role | Trigger |
|---|---|---|
| **Summoner** | Routes all incoming WhatsApp messages to correct agent | Every incoming WhatsApp message |
| **Support Agent** | Creates/updates complaint tickets | Resident says "lift kharab" / "water leak" |
| **Finance Agent** | Generates invoices, sends payment reminders | Monthly schedule / secretary command |
| **Facility Agent (PM)** | Assigns tasks to maintenance staff, tracks SLAs | Ticket escalation after 48 hrs |
| **Gatekeeper Agent** | Visitor management — approvals, alerts | Guard scans QR or types visitor name |
| **Broadcast Agent** | Society-wide announcements | Secretary sends notice via WhatsApp |

**The client never configures agents. They just use WhatsApp naturally.**

---

## SECTION 3: COMPLETE FEATURE LIST (V1)

### MODULE 1: Resident Management (CRM Core)
- **Flat Master:** Add flats with flat number, block, floor, BHK type
- **Resident Profiles:** Owner name, tenant name (if rented), mobile, email, vehicle numbers
- **Move In / Move Out:** Date tracking, NOC generation (auto PDF)
- **Family Members:** Secondary contacts per flat
- **Status Tags:** Owner-occupied / Rented / Vacant / Under Renovation
- **WhatsApp Action:** Admin types "Add resident" → Bot walks through form via WhatsApp chat

### MODULE 2: Complaint & Ticketing System
- **Resident Raises Ticket:** WhatsApp message to society number → Auto-categorized
- **Categories:** Plumbing, Electrical, Civil, Cleaning, Elevator, Security, Common Area, Internet
- **Auto-Assignment:** Based on category → routes to correct maintenance staff's WhatsApp
- **Status Updates:** Resident gets WhatsApp update when work starts and when closed
- **Photo Upload:** Resident can send photo on WhatsApp → attached to ticket
- **Escalation:** If ticket not closed in 48 hrs → Secretary gets auto-alert
- **Dashboard View:** Secretary sees all tickets, filter by status/category/flat
- **History:** Full complaint history per flat (useful for handover, legal)

### MODULE 3: Maintenance Billing & Payments
- **Maintenance Structure Setup:** Monthly amount per flat (can vary by BHK/floor)
- **One-Click Invoice Generation:** Secretary types "October maintenance bhejo" on WhatsApp → All invoices generated and sent
- **Payment Tracking:** Mark payment received (Cash/UPI/NEFT) via dashboard
- **Automated Reminders:** Day 1 (invoice), Day 10 (gentle reminder), Day 20 (firm reminder), Day 25 (late fee alert)
- **UPI Payment Link:** Each invoice has a UPI deeplink (PhonePe/GPay/Paytm)
- **Defaulter List:** Dashboard shows pending payments with days overdue
- **Late Fee Calculation:** Auto-calculated based on society rules
- **Receipts:** Auto-generated PDF receipt sent on WhatsApp when payment confirmed
- **Monthly Report:** Finance summary PDF auto-generated on 1st of every month
- **Advance Payment:** Track advance maintenance deposits per flat
- **GST Invoicing:** Optional GST-compliant invoice format for registered societies

### MODULE 4: Visitor Management (Gatekeeper)
- **Pre-Approved Entry:** Resident pre-approves visitor via WhatsApp → Guard gets confirmation code
- **Walk-In Approval:** Guard types visitor name + flat number → Resident gets WhatsApp alert → Approves/Denies with one message reply
- **Delivery Management:** "Delivery for Flat 302" → Resident gets WhatsApp alert
- **Frequent Visitors:** Maid, driver, cook — add as "frequent" → Auto-approved with one-time daily alert
- **Vehicle Log:** Visitor vehicle number logged for security
- **Entry/Exit Log:** All entries timestamped, viewable on dashboard
- **Emergency Contacts:** Quick-dial police, fire, ambulance from guard interface
- **Guard Shift Log:** Check-in/check-out of security staff

### MODULE 5: Society Notices & Broadcasts
- **Quick Notice:** Secretary types notice on WhatsApp → Sent to all residents instantly
- **Targeted Broadcast:** Send to specific block/floor/flat
- **Scheduled Notices:** "Meeting reminder bhejo kal subah 9 baje"
- **Important Announcements:** Water cut, power shutdown, parking rules
- **Poll/Survey:** Simple yes/no polls via WhatsApp (AGM attendance, rule changes)
- **Notice Board Archive:** All past notices stored, viewable on dashboard
- **Read Receipts:** Track WhatsApp delivery status

### MODULE 6: Amenity Booking
- **Clubhouse/Party Hall:** Booking calendar, slot management
- **Guest Parking:** Temporary parking slot allocation
- **Sports Courts:** Badminton, tennis, gym timeslots
- **Swimming Pool:** Entry slot booking
- **Booking via WhatsApp:** "Clubhouse book karna hai Saturday ko" → Bot checks availability → Confirms or offers alternatives
- **Payment Integration:** Booking fee collected via UPI link
- **Cancellation:** Auto-refund rules managed by system

### MODULE 7: Financial Ledger (Basic)
- **Income:** Maintenance collection, NOC fees, clubhouse booking fees
- **Expenses:** Guard salary, electricity bill, water pump, lift maintenance
- **Bank Balance:** Manual entry of society bank account balance
- **Monthly P&L:** Auto-generated income vs expense report
- **Sinking Fund:** Track capital reserve fund balance
- **Vendor Payments:** Log payment to vendors with receipt upload
- **Audit Trail:** All financial entries with timestamp and entry-by

### MODULE 8: Document Vault
- **Society Documents:** Registration certificate, by-laws, AGM minutes
- **Flat Documents:** Sale deed copies, NOCs (uploaded by admin)
- **Vendor Contracts:** AMC agreements, service contracts
- **Compliance Docs:** Fire NOC, lift inspection certificates
- **Shareable Links:** Generate temporary download links for residents
- **WhatsApp Access:** "Mujhe NOC chahiye" → Bot sends document link on WhatsApp

### MODULE 9: Society Staff Management
- **Staff Directory:** Guards, cleaners, maintenance, lift operator
- **Attendance:** Daily check-in via WhatsApp "present" message from staff
- **Salary Tracker:** Monthly salary ledger per staff member
- **Duty Roster:** Weekly schedule, shift assignments
- **Performance:** Complaint resolution rate per maintenance staff member

### MODULE 10: WhatsApp Command Center (THE KILLER FEATURE)
**This is the brain. Everything is accessible via WhatsApp for the secretary.**

Secretary Commands (examples):
```
"Report bhejo" → Monthly summary PDF
"Defaulters list" → All unpaid maintenance dues
"Open complaints" → All pending tickets
"Flat 402 history" → Full history of Flat 402
"Emergency broadcast: Water cut kal 6-10am" → Sent to all residents
"New resident: Flat 205, Rajesh Sharma, 9876543210" → Auto-onboarded
```

Resident Commands (examples):
```
"Complaint: Bathroom leak" → Ticket raised, confirmation sent
"Payment status" → Shows current month dues + payment status
"Booking: Clubhouse Saturday 6pm" → Availability check + booking
"My documents" → Link to their flat's documents
"Visitor: Ramu electrician aa raha hai" → Pre-approval sent to guard
```

---

## SECTION 4: SYSTEM ARCHITECTURE (TECHNICAL)

### Frontend (What Client Sees)
```
Next.js 14 (App Router)
├── Dashboard (KPI cards: Total flats, Open tickets, Pending payments)
├── Residents (CRUD table — flat wise)
├── Complaints (Kanban: Open → In Progress → Closed)
├── Payments (List view with filters, bulk actions)
├── Notices (Compose + history)
├── Amenities (Calendar booking view)
├── Reports (PDF download buttons)
└── Settings (Society profile, maintenance rates, WhatsApp config)
```
**UI Framework:** Shadcn/UI + Tailwind CSS (clean, no-nonsense CRM look)
**Auth:** Supabase Auth (Email/Password for admin, magic link option)

### Backend (What Runs the Magic)
```
Node.js / Express.js Microservices (Cloud Run)
├── ssma-summoner/          → Routes all WhatsApp messages
├── ssma-support-agent/     → Complaint management
├── ssma-finance-agent/     → Billing & payment logic
├── ssma-facility-agent/    → Task assignment, SLA tracking
├── ssma-gatekeeper-agent/  → Visitor management
├── ssma-broadcast-agent/   → Notice & alert sending
└── ssma-tool-gateway/      → WhatsApp send, PDF gen, UPI links
```

### Database (Supabase / InsForge)
```
Tables:
├── societies              → Society profile, config
├── blocks                 → Block/wing structure
├── flats                  → Flat master with status
├── residents              → Owner/tenant profiles, WhatsApp numbers
├── vehicles               → Vehicle registrations per flat
├── complaints             → Ticket table (category, status, assignee)
├── complaint_updates      → Timeline of updates per complaint
├── maintenance_invoices   → Monthly invoices per flat
├── payments               → Payment records with mode/date
├── visitors               → Visitor log (entry/exit, flat, purpose)
├── frequent_visitors      → Pre-approved recurring visitors
├── amenity_bookings       → Clubhouse/court bookings
├── notices                → Broadcast messages sent
├── staff                  → Society employee records
├── expenses               → Expense ledger
├── documents              → Document vault (Supabase Storage URLs)
└── whatsapp_sessions      → Conversation state per number
```

### WhatsApp Integration
- **Provider:** WhatsApp Business API via Meta Cloud API (Free for first 1000 conversations/month)
- **Fallback:** Twilio WhatsApp (₹0.85/message) or AiSensy/Interakt (Indian providers — simpler setup)
- **Webhook:** Every incoming WhatsApp message hits `ssma-summoner` endpoint
- **Session State:** Stored in `whatsapp_sessions` table — tracks multi-step conversations

### Infrastructure
- **Hosting:** Google Cloud Run (agents) + Vercel (Next.js frontend)
- **Database:** Supabase (free tier covers 50k rows, perfect for single society)
- **File Storage:** Supabase Storage (PDFs, documents, photos)
- **PDF Generation:** Puppeteer or React-PDF (receipts, invoices, reports)
- **UPI Links:** `upi://pay?pa={vpa}&pn={name}&am={amount}&tn={description}` — no payment gateway needed for V1
- **Cron Jobs:** Cloud Scheduler for monthly invoice generation, reminder sequences

---

## SECTION 5: V1 BUILD PLAN — STEP BY STEP

### PHASE 0: Setup (Day 1) — 4 Hours
**Goal:** Project skeleton running locally

**Steps:**
1. `npx create-next-app@latest ssma --typescript --tailwind --app` in `/Users/rohit/Projects/`
2. Install Shadcn/UI: `npx shadcn-ui@latest init`
3. Setup Supabase project → Run schema migrations (all tables from Section 4)
4. Setup `.env.local` with Supabase URL, Anon Key, Service Role Key
5. Create `/Users/rohit/Projects/ssma-agents/` directory for backend agents
6. Initialize Node.js project in `ssma-agents/`
7. Create Vercel project + connect GitHub repo

**Deliverable:** Next.js app running at `localhost:3000` with Supabase connected

---

### PHASE 1: Database & Auth (Day 2) — 6 Hours
**Goal:** All tables created, admin can log in

**Steps:**
1. Write and run Supabase SQL migrations (all 16 tables from architecture)
2. Setup Supabase RLS (Row Level Security) — society_id based isolation
3. Implement Auth: Login page (email/password), session handling
4. Create `lib/supabase.ts` client helper
5. Build society onboarding flow:
   - Step 1: Society name, address, total flats
   - Step 2: Block/wing structure
   - Step 3: WhatsApp business number
6. Create flat master import (Excel upload → parse → bulk insert)
7. Test: Create test society, add 5 flats, login works

**Deliverable:** Admin dashboard loads with empty state, auth works

---

### PHASE 2: Resident Management (Day 3) — 5 Hours
**Goal:** Full resident CRM working

**Steps:**
1. Build Residents page (`/residents`):
   - Table view: Flat No | Owner | Tenant | Status | WhatsApp | Actions
   - Add/Edit resident modal (Shadcn Dialog)
   - Search + filter by block/status
2. Build Flat detail view (`/flats/[id]`):
   - Resident info
   - Vehicle registrations
   - Complaint history (empty for now)
   - Payment history (empty for now)
3. Staff management basic table (`/staff`)
4. Vehicle registration form per resident
5. WhatsApp number validation (Indian format: +91XXXXXXXXXX)

**Deliverable:** Can add/edit/view all residents. CRM core working.

---

### PHASE 3: Complaint System (Day 4-5) — 8 Hours
**Goal:** End-to-end complaint lifecycle from dashboard

**Steps:**
1. Build Complaints page (`/complaints`):
   - Kanban board: Open | In Progress | Resolved
   - Each card: Flat No, Category, Description, Time elapsed, Assignee
   - Drag-and-drop status change (dnd-kit)
2. Create Complaint modal:
   - Flat selector, Category dropdown, Description, Priority, Photo upload
3. Complaint detail view:
   - Full timeline of updates
   - Add update (internal note or resident-visible)
   - Assign to staff member
   - Mark resolved
4. Build `ssma-support-agent/` (Node.js, Express):
   - `POST /ticket` → Creates ticket in Supabase
   - `POST /update` → Adds timeline update
   - `GET /escalations` → Returns tickets past SLA
5. Cloud Scheduler: Every 6 hrs → check for overdue tickets → send alert to secretary WhatsApp
6. Test full flow: Create ticket → Assign → Update → Close

**Deliverable:** Complete complaint management working. Agent deployed to Cloud Run.

---

### PHASE 4: Billing & Payments (Day 6-8) — 10 Hours
**Goal:** Monthly billing fully automated

**Steps:**
1. Settings page: Maintenance rate config per flat type (1BHK/2BHK/3BHK, per block)
2. Build Payments page (`/payments`):
   - Month selector
   - Table: Flat | Amount | Due Date | Status | Actions
   - Color coded: Green (Paid) | Yellow (Due) | Red (Overdue)
   - Mark as paid button (modal: date, mode, reference)
   - Bulk mark paid
3. Build Invoice generation:
   - PDF invoice template (React-PDF or Puppeteer)
   - Fields: Society logo, flat details, amount, due date, UPI QR
   - UPI QR Code: Generate from UPI link using `qrcode` npm package
4. Build `ssma-finance-agent/` (Node.js):
   - `POST /generate-invoices` → Creates invoice records for all flats for given month
   - `POST /send-invoices` → Sends PDF + UPI link to all residents via WhatsApp
   - `POST /send-reminders` → Sends reminder sequence based on due date
   - `POST /late-fee` → Calculates and adds late fee after cutoff
   - `GET /monthly-report` → Returns month's collection summary
5. Cloud Scheduler jobs:
   - 1st of month, 10am: Auto-generate and send invoices
   - 10th of month, 10am: Send first reminder to unpaid
   - 20th of month, 10am: Send firm reminder
   - 25th of month, 10am: Late fee warning
6. Build Receipt generation: Auto-send PDF receipt on payment confirmation
7. Expense tracking basic form (manual entry for V1)

**Deliverable:** Full billing cycle automated. Secretary just needs to confirm generation.

---

### PHASE 5: WhatsApp Integration (Day 9-11) — 12 Hours
**Goal:** WhatsApp is fully working for residents and secretary

**Steps:**
1. Setup WhatsApp Business API (Meta Cloud API):
   - Create Meta Business account
   - Get WhatsApp Business Number verified
   - Get permanent access token
   - Setup webhook URL → `ssma-summoner` Cloud Run URL
2. Build `ssma-tool-gateway/tools/whatsapp-send.js`:
   - `sendText(to, message)` — basic text
   - `sendTemplate(to, templateName, params)` — for invoices, alerts
   - `sendDocument(to, pdfUrl, caption)` — for PDF receipts/invoices
   - `sendInteractive(to, buttons, body)` — for approve/deny visitor
3. Build `ssma-summoner/` (Node.js):
   - Receives WhatsApp webhook
   - Identifies sender (lookup phone in `residents` table)
   - Identifies if sender is secretary or resident
   - Classifies intent using GPT-4o-mini:
     - Complaint → Support Agent
     - Payment query → Finance Agent
     - Visitor → Gatekeeper Agent
     - Notice → Broadcast Agent
     - Booking → Facility Agent
   - Handles multi-step conversations (session state in `whatsapp_sessions`)
4. Build resident-facing WhatsApp flows:
   - **Complaint Flow:** "Complaint: [description]" → Ticket created → Confirmation sent
   - **Payment Check:** "Payment status" → Current month dues + status
   - **Visitor Pre-approval:** "Visitor aa raha hai: [name, purpose]" → Guard notified
   - **Booking:** "Booking karna hai" → Bot asks what, when → Confirms
5. Build secretary WhatsApp commands:
   - "Report" → Monthly summary
   - "Complaints" → Open tickets list
   - "Defaulters" → Unpaid maintenance
   - "Broadcast: [message]" → Sent to all residents
   - "Remind payment: [flat number]" → Individual reminder
6. Test all flows end-to-end with real WhatsApp numbers

**Deliverable:** WhatsApp is fully functional. This is the demo moment.

---

### PHASE 6: Visitor Management (Day 12-13) — 8 Hours
**Goal:** Guard has simple interface, residents approve via WhatsApp

**Steps:**
1. Build Guard Interface (`/guard`) — simple, mobile-optimized:
   - Single input: Type flat number + visitor name
   - QR code scanner (camera access) for delivery packages
   - Resident pre-approvals list
   - Emergency contacts (quick-dial)
2. Build `ssma-gatekeeper-agent/`:
   - `POST /visitor` → Logs visitor, sends approval request to resident
   - `POST /approve` → Resident replies "Yes" → Guard gets confirmation
   - `POST /deny` → Resident replies "No" → Guard informed, reason optional
   - `POST /frequent` → Frequent visitor (maid etc.) — auto-approve with alert
   - `GET /log` → Today's visitor log
3. WhatsApp Interactive Message for visitor approval:
   - Template: "[Name] aa raha hai [Flat No] ke liye. Allow karein?" + [✅ Allow] [❌ Deny] buttons
4. Delivery-specific flow: "Delivery for 302" → Resident gets alert → Can say "Rakh do darwaze pe"
5. Pre-approval from resident: "Kal subah electrician aayega Ramu naam" → Added to pre-approvals
6. Entry/Exit log on dashboard with export to Excel/PDF

**Deliverable:** Guard has working interface, residents can approve via WhatsApp.

---

### PHASE 7: Notices & Broadcasts (Day 14) — 4 Hours
**Goal:** Secretary can blast announcements in seconds

**Steps:**
1. Build Notices page (`/notices`):
   - Compose notice (title, body, target: all/block/floor/flat)
   - Schedule notice (date-time picker)
   - Notice history list
2. Build `ssma-broadcast-agent/`:
   - `POST /send` → Sends to all targeted residents
   - `POST /schedule` → Stores in DB, Cloud Scheduler picks up
   - Rate-limited: Max 20 messages/second (WhatsApp API limit)
3. Secretary WhatsApp shortcut: "Notice: [title] | [body]" → Immediate broadcast
4. Poll feature: "Poll: AGM meeting kaun aa sakta hai? [Yes/No]" → Interactive WhatsApp poll
5. Scheduled notice example: "Maintenance notice kal subah 6 baje send karo"

**Deliverable:** Society-wide communication in under 30 seconds.

---

### PHASE 8: Reports & Analytics (Day 15) — 5 Hours
**Goal:** Secretary has all reports at fingertips

**Steps:**
1. Reports page (`/reports`):
   - Monthly Collection Report (total billed vs collected, defaulters)
   - Complaint Analytics (by category, average resolution time, staff performance)
   - Visitor Log Report (daily/weekly/monthly)
   - Expense Report
   - Society Financial Summary
2. PDF generation for each report (one-click download)
3. WhatsApp command: "Report" → Finance Agent generates PDF → Sends on WhatsApp
4. Dashboard KPI cards (main page):
   - Total Flats | Occupied | Vacant
   - This Month Collection %
   - Open Complaints
   - Pending Approvals
5. Date range filters on all reports

**Deliverable:** Full reporting suite. Secretary never needs Excel again.

---

### PHASE 9: Amenity Booking (Day 16) — 4 Hours
**Goal:** Clubhouse, parking, sports courts bookable via WhatsApp

**Steps:**
1. Build Amenities page (`/amenities`):
   - List of amenities with booking slots
   - Calendar view of bookings
   - Add/edit amenity (name, capacity, slots, price if any)
2. Booking flow via WhatsApp:
   - "Clubhouse book karna hai" → Bot asks date → Shows available slots → Confirms
   - UPI payment link if booking has fee
3. Admin can manually block slots (maintenance, society events)
4. Cancellation: "Booking cancel karo" → Lookup active booking → Confirm cancel

**Deliverable:** Self-service amenity booking. Reduces secretary WhatsApp load.

---

### PHASE 10: Testing, Polish & Deploy (Day 17-18) — 8 Hours
**Goal:** Production-ready, demo-able product

**Steps:**
1. End-to-end testing with a dummy society (20 flats, 3 blocks)
2. Mobile responsiveness check (dashboard works on mobile for secretary)
3. Guard interface optimized for cheap Android phones (minimal JS, fast load)
4. Error handling: WhatsApp unknown commands → Friendly "menu" response
5. Onboarding flow polish: New society setup in under 15 minutes
6. WhatsApp template pre-approval with Meta (submit invoice, reminder, visitor templates)
7. Production deploy:
   - Frontend → Vercel
   - All agents → Cloud Run
   - Database → Supabase (production project)
   - Domain setup: `app.smartsociety.in` or custom society domain
8. Create demo video (5 minutes showing WhatsApp flows)
9. Create sales deck (5 slides: Problem, Solution, WhatsApp Demo, Pricing, CTA)

**Deliverable:** Working product. Ready to demo to first paying client.

---

## SECTION 6: SALES SCRIPT (HOW ROHIT SELLS THIS)

### The 5-Minute Builder Demo Script

**Opening hook:**
> "Bhai, aapki society mein secretary kya karta hai pura din? WhatsApp pe handle karta hai na? Pani ka complaint, maintenance ka paisa, visitor ka permission — sab WhatsApp pe chaos hai. Main aapko dikhaata hoon ek solution."

**Live demo (on phone):**
1. Send "Complaint: Lift kharab hai" → Show ticket appearing on dashboard
2. Send "Payment status" → Show invoice with UPI QR
3. Show visitor approval with interactive WhatsApp buttons
4. Show secretary sending "Broadcast: Meeting Sunday 11am" → Delivered to all

**The close:**
> "Iska naam hai SSMA — Smart Society Management. Aapki society ke liye dedicated WhatsApp number. Residents ko koi app download nahi karna. Secretary ko Excel nahi kholna. Sab kuch WhatsApp pe hota hai, lekin backend mein sab organized hai — complaints, payments, visitors, notices. Setup ₹10,000. Monthly ₹5,000. First 3 months free agar aap abhi sign karo."

---

## SECTION 7: PRICING MODEL (INDIA MARKET)

| Plan | Target | Flats | Price | Includes |
|---|---|---|---|---|
| **Starter** | Small RWA | Up to 50 flats | ₹3,000/month | Complaints + Payments + WhatsApp (Basic) |
| **Standard** | Medium Society | 50–200 flats | ₹6,000/month | All V1 features |
| **Premium** | Large Complex | 200–500 flats | ₹12,000/month | All features + Dedicated support |
| **Builder Pack** | Local Builder | Per project | ₹15,000 setup + ₹5,000/month | Custom branding, 1-year contract |
| **PMC Plan** | Property Management Co. | Multi-society | ₹25,000/month | 5 societies, central dashboard |

**One-time setup fee:** ₹5,000–₹15,000 (includes data migration, WhatsApp setup, staff training)

**WhatsApp API cost (pass-through):**
- Meta Cloud API: First 1,000 conversations/month FREE
- Beyond that: ~₹0.55 per conversation (marketing), ₹0.35 (utility), ₹0 (service)
- For 100-flat society: ~₹200–500/month in API costs (absorbed in pricing)

---

## SECTION 8: THE X7 ADVANTAGE (WHY THIS IS DIFFERENT)

Competitors like **NoBrokerHood, MyGate, Apartment ADDA** exist. Here's why SSMA wins in the local builder market:

| Feature | SSMA | MyGate | NoBrokerHood |
|---|---|---|---|
| WhatsApp-native | ✅ Everything via WhatsApp | ❌ Requires app | ❌ Requires app |
| Setup complexity | ✅ 15 minutes | ❌ Complex onboarding | ❌ Needs tech person |
| Works on basic phones | ✅ WhatsApp only | ❌ Heavy app | ❌ Heavy app |
| Indian Tier 2/3 cities | ✅ Built for it | ❌ Metro focused | ❌ Metro focused |
| AI-powered backend | ✅ WhatsAI Agentverse | ❌ Rule-based | ❌ Rule-based |
| Local builder pricing | ✅ Affordable | ❌ Enterprise pricing | ❌ Locked pricing |
| Custom branding | ✅ Builder's brand | ❌ MyGate brand | ❌ NoBroker brand |

**The Moat:** WhatsApp-first experience + X7 multi-agent intelligence running behind a simple CRM. Competitors need app downloads. We don't.

---

## SECTION 9: FILE & FOLDER STRUCTURE

```
/Users/rohit/Projects/ssma/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx (sidebar nav)
│   │   │   ├── page.tsx (main dashboard KPIs)
│   │   │   ├── residents/page.tsx
│   │   │   ├── flats/[id]/page.tsx
│   │   │   ├── complaints/page.tsx
│   │   │   ├── payments/page.tsx
│   │   │   ├── notices/page.tsx
│   │   │   ├── amenities/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── staff/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── guard/page.tsx (separate simple UI)
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── residents/ (ResidentTable, ResidentModal, FlatCard)
│   │   ├── complaints/ (ComplaintKanban, TicketCard, TicketModal)
│   │   ├── payments/ (InvoiceTable, PaymentModal, ReceiptPreview)
│   │   ├── notices/ (NoticeComposer, NoticeHistory)
│   │   └── shared/ (Sidebar, Header, KPICard, StatusBadge)
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── pdf-generator.ts
│   │   └── upi.ts
│   └── types/
│       └── database.ts (all TypeScript types)
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_seed_data.sql
└── .env.local

/Users/rohit/Projects/ssma-agents/
├── ssma-summoner/
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── ssma-support-agent/
├── ssma-finance-agent/
├── ssma-facility-agent/
├── ssma-gatekeeper-agent/
├── ssma-broadcast-agent/
└── ssma-tool-gateway/
    └── tools/
        ├── whatsapp-send.js
        ├── pdf-generate.js
        └── upi-link.js
```

---

## SECTION 10: ENVIRONMENT VARIABLES

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp Business API (Meta)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=  # For webhook verification

# OpenAI (for Summoner intent classification)
OPENAI_API_KEY=

# Agent Security (shared secret — same as X7)
AGENT_SECRET=

# GCP
GCP_PROJECT_ID=agentverse-summoner-h5jv989fps
GCP_REGION=us-central1

# PDF & Storage
SUPABASE_STORAGE_BUCKET=ssma-documents
```

---

## SECTION 11: BUILD EXECUTION RULES

### How Claude + Codex Will Build This

1. **One phase at a time** — Complete and test Phase 0 before starting Phase 1
2. **Database first, UI second** — Schema locked before any frontend work
3. **WhatsApp sandbox** — Use Meta's test number before switching to live number
4. **Agent-by-agent** — Build and test each agent independently before connecting to Summoner
5. **Real data testing** — After Phase 2, use dummy data for 1 test society throughout
6. **No premature optimization** — V1 is about working, not perfect. Ship fast, iterate.
7. **Git commits per phase** — Each phase = one commit with clear message

### Claude's Role
- Architecture decisions
- Code review and debugging
- Database schema design
- Prompt engineering for agents
- Security review

### Codex's Role
- Boilerplate generation (table components, form modals, API routes)
- SQL migration scripts
- TypeScript type generation from schema
- Repetitive agent scaffolding

---

## SECTION 12: SUCCESS METRICS (V1 Launch)

| Metric | Target |
|---|---|
| Setup time for new society | < 15 minutes |
| WhatsApp response time | < 3 seconds |
| Monthly invoice generation | < 60 seconds for 200 flats |
| Dashboard load time | < 2 seconds |
| First paying client | Within 30 days of build complete |
| Monthly recurring revenue | ₹1,00,000 within 90 days (20 societies at avg ₹5,000) |

---

## APPENDIX: FUTURE V2 FEATURES (NOT IN V1)

- **Society AGM module** — Digital voting, proxy submission
- **Legal notices** — Auto-generate legal notices for chronic defaulters
- **Intercom integration** — IP camera + door unlock via WhatsApp
- **Multi-society dashboard** — PMC parent view across all properties
- **Owner app** — Light React Native app (V1 is WhatsApp-only)
- **Vendor marketplace** — Connect societies to plumbers, electricians locally
- **Bulk SMS fallback** — For residents without WhatsApp (very rare in India now)
- **Government compliance** — Society registration renewal reminders, RERA compliance
- **Audit report** — Annual society audit-ready financial document pack

---

> *"Backend mein 6 AI agents hain. Client ko dikhai deta hai ek simple dashboard aur WhatsApp number. Wohi asली product design hai."*
>
> — Rohit Kag, Xero Seven

---
*Document Version: 1.0 | Status: BUILD APPROVED | Next Step: Phase 0 — Project Setup*
