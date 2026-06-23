# 🏗️ X7 RealEstate OS — The Builder's AI Command Center
### Complete Marketing, Sales & Colony Management Platform for Tier 2 Indian Builders
> **Author:** Rohit Kag — Founder, Xero Seven  
> **Date:** May 2026  
> **Status:** V1 BLUEPRINT — Ready for Build  
> **Codename:** Project NEEV (नींव — The Foundation)  
> **Target Market:** Builders, Colony Owners, and Real Estate Marketers in Tier 2 Indian Cities (Indore, Bhopal, Jaipur, Lucknow, Nagpur, Surat, Ahmedabad)

---

> *"Tier 2 city ka builder ₹2 Cr ka project launch karta hai, ₹50 Lakh marketing me udaa deta hai, aur phir bhi 40% inventory unsold rehti hai. Kyun? Kyunki uska marketing system hai: ek WhatsApp group, ek part-time social media boy, aur ek photographer jo mahine me ek baar aata hai. Hum ye sab replace kar rahe hain — AI se."*

---

## IMPLEMENTATION STATUS — CURRENT REPO SNAPSHOT (23 June 2026)

> This section is the **ground-truth repo status** for Claude Cowork. The rest of this document remains the target blueprint. If blueprint and code differ, trust this section for "what is actually built right now".

### Phase 1 — Actually Built

- Next.js dashboard shell is built with routes for dashboard, leads, site visits, bookings, content, campaigns, colony, reports, settings, login, and guard.
- Supabase auth login + middleware gating are built.
- Core Supabase schema, seed data, agent tables, content tables, and marketing tables are built.
- Landing page routes are live from Supabase-backed `landing_pages` data.
- Dashboard readiness route is live and reports real env, service, and data-probe state.
- Dashboard build and type-check pass locally.

### Phase 2 — Actually Built

- Lead Kanban pipeline is built with drag/drop stage movement, hot/source filters, lead detail modal, and bulk actions (assign, export CSV, queue follow-up).
- Site visit planner is built with weekly board, quick scheduling, post-visit feedback, and reminder queue creation.
- Booking workbench is built with plot grid, token booking creation, UPI deeplink generation, and receipt PDF generation.
- Sales Agent service exists at `agents/x7-re-sales-agent/` with:
  - `GET /health`
  - `GET /health/dependencies`
  - `GET /webhooks/whatsapp`
  - `POST /webhooks/whatsapp`
  - `POST /qualify`
  - `POST /follow-up`
  - `POST /book-visit`
  - `POST /drip`
  - `POST /dispatch-due`
  - `POST /brochure/send`
- Dashboard sales routes exist and are wired:
  - `/api/sales/follow-up`
  - `/api/sales/drip`
  - `/api/sales/book-visit`
  - `/api/sales/site-visits/feedback`
  - `/api/sales/bookings/create`
  - `/api/sales/bookings/receipt`
- Read-side loading is now Supabase-first with demo fallback for leads, site visits, and bookings.
- WhatsApp Cloud API code path is implemented:
  - webhook verification
  - inbound message ingestion
  - outbound text send
  - outbound brochure PDF send
  - status updates back into `whatsapp_messages`
  - due follow-up dispatch from `follow_up_queue`
- Brochure send logic checks `brochure_assets` first, then falls back to `projects.brochure_url`.

### Phase 2 — Partially Built / Conditional

- Supabase persistence is live **only when env vars are provided**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- WhatsApp/Meta integration is code-complete but **requires real Meta credentials** to function:
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_VERIFY_TOKEN`
  - `META_APP_SECRET`
- Default inbound lead creation from webhook requires:
  - `DEFAULT_BUILDER_ID`
  - `DEFAULT_PROJECT_ID`
- Meta Marketing API credentials are only env-scaffolded in this repo at this stage; campaign creation belongs to Phase 4.

### Phase 2 — Still Missing

- Real Meta WhatsApp Business account credentials are not stored in repo, so live send/receive against Meta has not been verified here.
- A real scheduler/cron trigger is still needed to call `POST /dispatch-due` on a cadence in production.
- Full builder-specific brochure asset generation pipeline is not built yet; current code only sends an existing stored brochure URL/PDF.
- Live WhatsApp conversation UI on every lead is not fully hydrated from DB for all cases yet; the storage path exists, but the UI history layer still needs final polish.
- Payment gateway webhook reconciliation is not part of Phase 2 yet. Current booking flow handles token intent + receipt + UPI deeplink, not final bank-confirmed settlement.

### Phase 5 — Actually Built

- Colony schema expansion is built in `supabase/migrations/007_colony_tables.sql`:
  - notices
  - amenities
  - amenity_bookings
  - colony_staff
  - complaint_updates
  - colony_documents
  - payment_receipts
  - colony settings + reporting views
- Colony Agent service exists at `agents/x7-re-colony-agent/` with:
  - `POST /inbound`
  - `POST /billing/generate`
  - `POST /billing/confirm-payment`
  - `POST /ticket/open`
  - `POST /ticket/update`
  - `POST /visitor/log`
  - `POST /visitor/respond`
  - `POST /notice/broadcast`
  - `POST /amenity/book`
  - `POST /cron/reminders`
  - `POST /cron/billing`
  - `POST /cron/escalate`
- Finance Agent colony-support routes exist at `agents/x7-re-finance-agent/`:
  - `POST /razorpay/webhook`
  - `POST /payment/manual`
  - `GET /report/monthly`
  - `GET /report/revenue`
  - `POST /cron/monthly-summary`
- Tool Gateway support for Phase 5 exists:
  - WhatsApp send
  - UPI link generation
  - PDF invoice / receipt / report generation
- Dashboard colony routes are now wired and live:
  - `/colony`
  - `/colony/residents`
  - `/colony/complaints`
  - `/colony/visitors`
  - `/colony/amenities`
- Colony dashboard now has:
  - overview console with KPI cards
  - residents registry view
  - resident add/edit secretary dialog
  - recent notices panel
  - billing trigger button
  - notice composer dialog
  - complaint raise dialog from dashboard
  - complaint board with direct status progression
  - visitor desk with direct approve / deny actions
  - amenity booking desk with booking form, booking list, and rules panel
- New Phase 5 dashboard APIs are built:
  - `/api/colony/residents`
  - `/api/colony/residents/[id]`
  - `/api/colony/complaints`
  - `/api/colony/amenities/book`
- Read-side loading is Supabase-first with demo fallback for residents, complaints, visitors, and notices.
- Amenity read-side loading is also Supabase-first with demo fallback.

### Phase 5 — Partially Built / Conditional

- Live Supabase-backed colony data requires env vars and reachable DB:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Colony Agent and Finance Agent live flows require runtime env + reachable local/remote services:
  - `COLONY_AGENT_URL`
  - `FINANCE_AGENT_URL`
  - `AGENT_SECRET`
- Billing generation and notice broadcast are wired from dashboard, but real delivery depends on agent runtime plus actual external credentials.
- Razorpay webhook handler exists in finance agent, but real Razorpay account/webhook verification has not been completed in this repo snapshot.

### Phase 5 — Still Missing

- Visitor export/report UI is not built yet.
- Real scheduled jobs for monthly billing, reminder dispatch, and complaint escalation still need production cron orchestration.
- Live payment reconciliation from real Razorpay webhook through colony billing state still depends on production credentials + deployed finance-agent runtime.

### Phase 6 — Actually Built

- Summoner service now exists at `agents/x7-re-summoner/` with:
  - `GET /health`
  - `GET /health/dependencies`
  - `POST /route`
  - `POST /dispatch`
- Summoner now classifies and routes these categories:
  - `sales_inquiry`
  - `booking`
  - `content_request`
  - `campaign_request`
  - `payment_query`
  - `complaint`
  - `visitor`
  - `amenity_booking`
- Summoner can optionally execute downstream calls to:
  - sales agent
  - content agent
  - ads agent
  - colony agent
  - finance agent
- Summoner uses the same `AGENT_SECRET` convention as the rest of the repo and logs agent runs into `agent_runs` when Supabase service credentials are present.
- Phase 6 packaging now exists for the missing service:
  - `package.json`
  - `.env.example`
  - `Dockerfile`
  - `.dockerignore`
- Agent port map has been normalized for local mesh operation:
  - sales agent `8080`
  - tool gateway `8081`
  - summoner `8082`
  - content agent `8083`
  - ads agent `8085`
  - ghost closer `8086`
  - colony agent `8087`
  - finance agent `8088`
- Dashboard server helpers are now Summoner-first:
  - sales proxy
  - content proxy
  - ads proxy
  - colony proxy
  - finance proxy
- Dashboard mesh health route now exists:
  - `/api/agent-mesh/health`
- Local agent-mesh scripts now exist:
  - `scripts/start-phase6-local.sh`
  - `scripts/check-phase6-local.sh`
  - `scripts/stop-phase6-local.sh`
- Central orchestration schema now exists in `supabase/migrations/008_agent_orchestration.sql`:
  - `agent_dispatch_queue`
  - `agent_cron_runs`
  - `v_dispatch_queue_backlog`
- Summoner orchestration routes now exist:
  - `POST /queue/enqueue`
  - `POST /queue/drain`
  - `POST /cron/run-job`
  - `POST /cron/run-all`
- Central WhatsApp ingress now exists on Summoner:
  - `GET /webhooks/whatsapp`
  - `POST /webhooks/whatsapp`
- Sales-agent webhook path can now run in proxy mode via `SUMMONER_URL`, so deployed setups can force Meta webhook traffic through Summoner first.
- Summoner cron catalog now covers existing agent jobs for:
  - sales follow-up dispatch
  - content render/publish drains
  - ads insights/optimize/CAPI drains
  - ghost closer hunt batch
  - colony reminders/escalations
  - finance monthly summary

### Phase 6 — Partially Built / Conditional

- Real downstream routing execution depends on reachable agent runtimes:
  - `SALES_AGENT_URL`
  - `CONTENT_AGENT_URL`
  - `ADS_AGENT_URL`
  - `COLONY_AGENT_URL`
  - `FINANCE_AGENT_URL`
- Supabase-backed route logging depends on:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Builder/project-aware content and campaign routing is only executable when:
  - `builder_id` is known
  - `project_id` is known
  - or `DEFAULT_BUILDER_ID` / `DEFAULT_PROJECT_ID` are configured
- Colony and finance flows that touch residents, invoices, notices, or receipts still require live Supabase credentials and data, even though the local runtime mesh itself now boots cleanly.
- Queue persistence and cron audit need live Supabase credentials to operate as a durable event layer.
- WhatsApp ingress routing quality depends on DB context:
  - resident phone lookup for colony messages
  - lead/default builder context for sales messages

### Phase 6 — Still Missing

- There is still no separate broker/worker system; the current queue is Summoner + Supabase table based, not Kafka/RabbitMQ style infra.
- Full production orchestration still needs deployed Cloud Run services plus cron/dispatch automation for scheduled agent flows.
- Production WhatsApp ingress is now Summoner-capable, but it is only mandatory once `SUMMONER_URL` is set on the sales-agent deployment and Meta is pointed at the Summoner endpoint.

### Local Verification Snapshot

- `apps/dashboard`: `npm run build` passes
- `apps/dashboard`: `npm run type-check` passes
- Stable local dashboard runtime is currently verified from the no-space workspace copy:
  - `/Users/rohit/Documents/Claude/Projects/X7-Real-estate-local/apps/dashboard`
- Dashboard `GET /api/ping` returns `200`
- Dashboard `GET /api/ops/readiness` returns live JSON with:
  - Supabase client: ready
  - Supabase service role: ready
  - default builder context: ready
  - live data probes for builders, projects, leads, residents: ready
- Sales pages `/leads`, `/site-visits`, `/bookings` return `200` locally
- Colony pages `/colony`, `/colony/residents`, `/colony/complaints`, `/colony/visitors`, `/colony/amenities` return `200` locally
- Receipt route returns `application/pdf`
- Sales agent health route returns `200`
- Summoner syntax check passes locally
- Summoner `GET /health` returns `200`
- Summoner `POST /route` returns valid routing decisions
- Summoner `POST /route` with `execute=true` successfully dispatches into the live sales agent when that runtime is up
- Summoner `POST /dispatch` successfully proxies a direct request into the live sales agent when that runtime is up
- Full local agent mesh health returns `200` simultaneously for:
  - sales
  - tool-gateway
  - summoner
  - content
  - ads
  - ghost-closer
  - colony
  - finance
- Dashboard `/api/agent-mesh/health` returns `200`
- Summoner webhook verification endpoint returns `200` with the expected Meta challenge when `WHATSAPP_VERIFY_TOKEN` matches
- Landing route `http://127.0.0.1:3001/shree-krishna-developers/krishna-greens-super-corridor` returns live project data from Supabase

### Current Launch Blockers

- WhatsApp Business credentials are still missing:
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_VERIFY_TOKEN`
  - `META_APP_SECRET`
- Meta Ads credentials are still missing:
  - `META_ACCESS_TOKEN`
  - `META_AD_ACCOUNT_ID`
- Razorpay credentials are still missing:
  - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
  - `RAZORPAY_KEY_SECRET`
  - `RAZORPAY_WEBHOOK_SECRET`
- AI/media credentials are still missing:
  - `OPENAI_API_KEY`
  - `REMOTION_MODE`
  - optional `HIGGSFIELD_API_KEY`

---

## THE CORE PROBLEM (DEEP RESEARCH)

### What Kills a Tier 2 Builder's Business?

Indian Tier 2 city builders face a **marketing paradox**: they have great land, decent construction, and genuine demand — but they cannot sell because their marketing is stuck in 2015.

| Problem | Reality | Impact |
|---|---|---|
| **No Content Pipeline** | Builder posts 1-2 Facebook photos per month from phone camera | Zero brand recall, zero organic reach |
| **Wasted Ad Spend** | ₹30,000-1,00,000/month on Meta ads managed by random "digital marketing agency" | Leads come but 70% are junk, no follow-up system |
| **No Video Content** | Competitors using drone shots, walkthroughs, reels — builder has nothing | Loses the aspirational buyer who decides on visuals |
| **Dead Leads** | Leads come via ads, sit in a WhatsApp group or Excel sheet, and rot | 80% of warm leads go cold within 48 hours |
| **No Trust Signals** | No RERA highlighted, no construction updates, no testimonials | Educated buyer goes to RERA-compliant branded competitor |
| **Zero Post-Sale Value** | After selling, builder disappears — no colony management, no community | Bad word-of-mouth kills next project launch |
| **Regulatory Fear** | 450+ unauthorized colonies in Indore alone create buyer hesitation | Builder can't counter the narrative without content |
| **The "Distance Mentality"** | Buyers won't consider plots even 4-5 km outside city limits | Builder can't sell peripheral land without serious marketing |
| **Manual Everything** | Site visit booking, payment tracking, follow-ups — all done via personal WhatsApp | Chaos. Lost messages. No audit trail. No professionalism. |

### The ₹50 Lakh Black Hole (Where Builder's Money Goes Today)

```
Builder's Typical Annual Marketing Spend:
├── "Digital Marketing Agency" (runs bad Meta ads)       — ₹3-5L/year
├── Newspaper ads (TOI Indore, Dainik Bhaskar)           — ₹5-10L/year  
├── Hoardings & Flex boards                               — ₹3-8L/year
├── Broker commissions (2-3% of sale)                     — ₹10-20L/year
├── Events & Site visits (tent, chai, transport)          — ₹2-5L/year
├── Random photographer / videographer                    — ₹50K-2L/year
├── Printed brochures (outdated within a month)           — ₹50K-1L/year
└── TOTAL: ₹25-50L/year with ZERO accountability
```

**What they get:** Some leads in a WhatsApp group. No pipeline. No content library. No follow-up automation. No analytics. No clue which ₹ spent brought which buyer.

---

## THE SOLUTION: X7 RealEstate OS

> **"Builder ko do cheezein do: ek content machine jo brand banaye, aur ek sales machine jo lead se booking tak le jaaye. Baaki sab builder ka kaam hai — construction."**

X7 RealEstate OS is a **full-stack AI-powered operating system** that gives a Tier 2 builder:

1. **🎬 CONTENT ENGINE** — AI generates 60+ social media posts, 15+ videos, drone edit reels, and festival creatives per month — automatically.
2. **📣 MARKETING ENGINE** — Meta/Google Ads management, lead capture, WhatsApp auto-response, retargeting — all AI-managed.
3. **📞 SALES ENGINE** — Lead qualification, site visit scheduling, follow-up sequences, payment tracking — zero manual work.
4. **🏘️ COLONY MANAGEMENT** — Post-sale resident management, maintenance billing, visitor management, complaint system — all via WhatsApp.
5. **📊 BUILDER DASHBOARD** — One screen to see: leads, site visits, bookings, payments, content calendar, and colony health.

---

## SECTION 1: THE CONTENT ENGINE (THE BIGGEST WEAPON)

> *"Content nahi hai toh brand nahi hai. Brand nahi hai toh trust nahi hai. Trust nahi hai toh sale nahi hai."*

### 1.1 The AI Content Factory

The Content Engine produces **4 types of content automatically** using a combination of X7 agents, **Higgsfield AI**, and **Remotion**:

#### TYPE 1: Social Media Posts (Instagram + Facebook)
**Volume:** 15-20 posts/month (auto-generated, auto-scheduled)

| Day | Content Pillar | Example Post | AI Tool Used |
|---|---|---|---|
| **Monday** | 📍 Location Advantage | "Why [Area] is the next Super Corridor of Indore — 3 reasons" with infographic | GPT-4o + Higgsfield `gpt_image_2` |
| **Tuesday** | 🏗️ Construction Update | Drone-shot collage showing week's progress + overlay text: "Your dream home is taking shape" | Higgsfield `product_shot` mode + Remotion overlay |
| **Wednesday** | 📚 Educational | Carousel: "Plot khareedne se pehle ye 5 documents zaroor check karein" (Hindi/English) | GPT-4o + Higgsfield `social_carousel` |
| **Thursday** | 🏆 Social Proof | Video testimonial from buyer: "Maine 2024 me plot liya, aaj value double hai" | Higgsfield `marketing_studio_video` (UGC mode) |
| **Friday** | 🏡 Lifestyle / Dream | "Imagine waking up to this view — your own villa plot at [Project Name]" with AI render | Higgsfield `lifestyle_scene` + GPT Image 2 |
| **Saturday** | 📊 Investment Logic | "Plot vs Apartment: 5-Year return comparison chart" | GPT-4o data + Higgsfield `hero_banner` |
| **Sunday** | 🎉 Engagement | "Corner plot ya Park-facing plot? Comment karein!" — This or That poll | GPT-4o caption + Higgsfield `gpt_image_2` |

**Festival / Seasonal Posts (Auto-triggered):**
- Diwali, Holi, Navratri, Independence Day, Republic Day, Makar Sankranti, Raksha Bandhan
- Auto-generated with project branding + festival theme using Higgsfield `restyle` mode
- Scheduled 2 days in advance via Meta Business Suite API

#### TYPE 2: Short-Form Video (Reels / Shorts / TikTok)
**Volume:** 8-12 videos/month

| Video Type | Duration | Creation Method | Example |
|---|---|---|---|
| **Site Walkthrough** | 30-60s | Raw drone/phone footage + Remotion overlay (text, logo, music, captions) | "Walk with us through [Colony Name] — RERA Approved, 40ft wide roads" |
| **Before/After** | 15-30s | Split-screen Remotion template with old land vs developed colony | "From barren land to dream colony — 6 months ka safar" |
| **Price Reveal** | 15s | Remotion animated template: price counting up with suspense music | "Plots starting from... ₹XX Lakh! 🔥" |
| **Testimonial UGC** | 30-60s | Higgsfield `marketing_studio_video` (UGC mode) with real buyer avatar | Buyer sharing why they chose this colony |
| **Location Explainer** | 45-60s | Remotion + Google Maps data overlay: distances to hospital, school, highway | "5 min to Ring Road, 10 min to Airport, 15 min to IT Park" |
| **Construction Progress** | 30s | Timelapse Remotion template stitching weekly site photos | Monthly construction update reel |
| **Vastu Tips** | 30-45s | Higgsfield `marketing_studio_video` with expert avatar presenting tips | "North-facing plot kyu best hai — Vastu ke 3 reasons" |
| **Ad Creative** | 15-30s | Higgsfield `marketing_studio_video` (product_showcase mode) | Direct response ad for Meta/YouTube |

#### TYPE 3: Long-Form Video (YouTube / Brochure Replacement)
**Volume:** 2-4 videos/month

| Video Type | Duration | Creation Method |
|---|---|---|
| **Full Project Walkthrough** | 3-5 min | Remotion stitching drone footage + floor plans + price cards + CTA |
| **"Why Invest in [Area]" Documentary** | 5-8 min | Remotion data-driven: govt infrastructure plans, price appreciation charts, expert voiceover |
| **Virtual Site Visit** | 2-3 min | 360° footage + Remotion overlay with plot numbers, dimensions, pricing |
| **Builder's Story** | 3-5 min | Higgsfield `marketing_studio_video` (TV spot mode) — founder sharing vision |

#### TYPE 4: Ad Creatives (Meta + Google + YouTube)
**Volume:** 10-15 variants/month (A/B tested automatically)

| Ad Format | Platform | Creation Method |
|---|---|---|
| **Static Image Ad** | Facebook/Instagram Feed | Higgsfield `ad_creative_pack` mode → 3-5 variants per campaign |
| **Carousel Ad** | Instagram/Facebook | Higgsfield `social_carousel` → 5-slide project walkthrough |
| **Video Ad (15s)** | Instagram Reels, YouTube Shorts | Higgsfield `marketing_studio_video` → hook + offer + CTA |
| **Video Ad (30s)** | Facebook In-Feed, YouTube Pre-Roll | Remotion template: problem → solution → project → CTA |
| **Click-to-WhatsApp Ad** | Facebook/Instagram | Static/Video + WhatsApp CTA → direct to Sales Agent |
| **Google Display Ad** | GDN Banner | Higgsfield `hero_banner` mode → responsive display ads |

### 1.2 The Remotion Video Factory (Technical Architecture)

Remotion lets us treat **video production as code** — React components that render to MP4/WebM.

```
/Users/rohit/Projects/x7-realestate/remotion/
├── src/
│   ├── compositions/
│   │   ├── PropertyWalkthrough.tsx    — Full project video (drone + overlay)
│   │   ├── PriceReveal.tsx           — Animated price announcement
│   │   ├── LocationExplainer.tsx     — Map + distances + infrastructure
│   │   ├── ConstructionUpdate.tsx    — Timelapse from site photos
│   │   ├── TestimonialReel.tsx       — Buyer testimonial with branding
│   │   ├── BeforeAfter.tsx           — Split-screen transformation
│   │   ├── InvestmentComparison.tsx  — Plot vs Apartment data animation
│   │   ├── FestivalCreative.tsx      — Diwali/Holi branded template
│   │   └── AdCreative.tsx            — 15s/30s ad template
│   ├── components/
│   │   ├── Logo.tsx                  — Builder's animated logo intro
│   │   ├── PriceTag.tsx              — Animated price counter
│   │   ├── LocationPin.tsx           — Map pin with distance ring
│   │   ├── RERABadge.tsx             — RERA compliance overlay
│   │   ├── CTAButton.tsx             — "Call Now" / "WhatsApp" button
│   │   ├── Captions.tsx              — Auto-generated Hindi/English captions
│   │   └── Watermark.tsx             — Anti-theft brand watermark
│   ├── data/
│   │   ├── projects.json             — All project data (name, plots, prices, location)
│   │   └── content-calendar.json     — Monthly content schedule
│   └── utils/
│       ├── renderBatch.ts            — Render 50+ videos from project data in one command
│       └── platformPresets.ts        — 9:16 (Reels), 1:1 (Feed), 16:9 (YouTube)
├── public/
│   ├── fonts/                        — Hindi/English typography (Noto Sans Devanagari)
│   ├── music/                        — Royalty-free background tracks
│   └── assets/                       — Logos, icons, brand elements
└── remotion.config.ts
```

**How Batch Rendering Works:**
```
Builder uploads 10 drone photos + project data JSON
  → Remotion reads data props (project name, prices, plots, location)
    → Renders 10 unique videos in parallel:
       1× Full Walkthrough (16:9, 3 min)
       2× Reels (9:16, 30s each)
       3× Ad Creatives (1:1, 15s each)
       2× Story variants (9:16, 15s each)
       2× YouTube Pre-roll (16:9, 30s each)
    → Output: 10 ready-to-publish MP4 files
    → Auto-uploaded to Content Calendar → Scheduled for posting
```

### 1.3 The Higgsfield Integration (AI Visual & Video Generation)

Higgsfield fills the gap where raw footage doesn't exist:

| Use Case | Higgsfield Model | How It's Used |
|---|---|---|
| **AI Render of Dream Home on Plot** | `gpt_image_2` (via `product-photoshoot`) | Builder uploads plot photo → AI renders a 3D villa on it (lifestyle_scene mode) |
| **Professional Ad Creative Pack** | `marketing_studio_image` | Generate 5 ad variants for Meta campaigns in one command |
| **UGC-Style Testimonial Video** | `marketing_studio_video` (ugc mode) | AI avatar delivers buyer testimonial in Hindi — no real buyer needed for initial launch |
| **Product Showcase Video** | `marketing_studio_video` (product_showcase) | Colony/project showcase with cinematic transitions |
| **Festival Creative** | `gpt_image_2` + `restyle` mode | Take existing project banner → auto-restyle for Diwali/Holi/Navratri theme |
| **Virtual Model Walkthrough** | `marketing_studio_video` (virtual_try_on) | AI person walking through the colony — before construction is even done |
| **Pinterest Pins** | `product-photoshoot` (moodboard_pin) | Vertical lifestyle pins for Pinterest real estate boards |
| **Virality Score** | `brain_activity` | Score every video before posting: hook strength, attention retention, distraction risk |

**Higgsfield Workflow for Builder Content:**
```bash
# Step 1: Import project from website
higgsfield marketing-studio products fetch --url https://buildername.com/project --wait

# Step 2: Create a UGC ad video
higgsfield generate create marketing_studio_video \
  --prompt "Hindi speaking real estate expert explaining why this colony is the best investment in Indore" \
  --product_ids @products.json \
  --mode ugc \
  --duration 30 \
  --aspect_ratio 9:16 \
  --wait

# Step 3: Score the video for virality
higgsfield generate create brain_activity --video ./output.mp4 --wait

# Step 4: If score > 60, schedule for posting. If < 40, regenerate with different hook.
```

### 1.4 The Content Calendar Agent (Automated Scheduling)

**X7 Agent:** `x7-realestate-content-agent` (Cloud Run)

This agent:
1. **Generates** the monthly content calendar based on project data + festivals + market trends
2. **Creates** content using GPT-4o (captions/copy) + Higgsfield (visuals/videos) + Remotion (data videos)
3. **Scores** every piece using Higgsfield Virality Predictor before scheduling
4. **Schedules** posts via Meta Business Suite API (Facebook + Instagram)
5. **Tracks** engagement (likes, comments, shares, saves) and auto-adjusts future content

```
Content Calendar Automation Flow:

1st of Month:
  → Content Agent generates 30-day calendar based on:
     • Project phase (Pre-launch / Active / Last Units)
     • Upcoming festivals
     • Competitor activity (web-scraped)
     • Past content performance (engagement data)
  → Creates all 20 posts + 12 videos in batch
  → Each video scored via Virality Predictor
  → Low-score content regenerated with different hook/style
  → Calendar sent to Builder for approval on WhatsApp:
     "Sahab, June ka content calendar ready hai. 20 posts, 12 videos. 
      Approve karein ya changes batayein."
  → Builder replies "✅" → Auto-scheduled to Meta Business Suite

Daily (Auto):
  → 1 post published at optimal time (based on past engagement data)
  → 1 story/reel published
  → Engagement data collected

Weekly:
  → Performance report sent on WhatsApp:
     "This week: 12,400 reach, 340 profile visits, 28 WhatsApp clicks.
      Best post: 'Location Advantage Reel' — 4,200 views.
      Suggestion: More location content — audience loves it."
```

---

## SECTION 2: THE MARKETING ENGINE (LEAD GENERATION MACHINE)

> *"Content brand banata hai. Marketing leads laata hai. Dono alag cheezein hain. Builder ko dono chahiye."*

### 2.1 The Meta Ads Autopilot

**X7 Agent:** `x7-realestate-ads-agent` (Cloud Run)

| Feature | How It Works |
|---|---|
| **Auto Ad Creation** | Agent generates 5 ad variants (image + copy) per campaign using Higgsfield ad_creative_pack |
| **Click-to-WhatsApp Ads** | Primary ad type — buyer clicks ad → lands directly in WhatsApp conversation with Sales Agent |
| **Audience Building** | Lookalike audiences from past buyer data + interest targeting (investment, home loans, luxury brands) |
| **Geo-Targeting** | 5-15 km radius around project site + investor hubs in nearby cities |
| **Budget Optimization** | AI monitors CPL (Cost Per Lead) and reallocates budget to best-performing ad sets daily |
| **A/B Testing** | Automatically rotates creatives — kills underperformers, scales winners |
| **Retargeting** | Website visitors + video viewers + WhatsApp engagers → shown follow-up ads |
| **Conversion API (CAPI)** | Sends offline events (site visit booked, payment made) back to Meta for optimization |

**Ad Campaign Types:**

```
CAMPAIGN 1: Awareness (Top of Funnel)
├── Objective: Video Views / Reach
├── Creative: Project walkthrough video (Remotion) / Lifestyle render (Higgsfield)
├── Audience: 25-55 age, 5-20 km radius, Interests: real estate, investment
├── Budget: ₹500-1,000/day
└── Goal: Build brand awareness, grow video view audiences for retargeting

CAMPAIGN 2: Consideration (Mid Funnel)
├── Objective: Traffic / Engagement
├── Creative: Carousel (5 reasons to invest) / Location explainer reel
├── Audience: Retargeted video viewers (watched >50%) + Lookalike of past buyers
├── Budget: ₹500-1,000/day
└── Goal: Drive to landing page / WhatsApp

CAMPAIGN 3: Conversion (Bottom of Funnel)
├── Objective: Lead Generation / Click-to-WhatsApp
├── Creative: Price reveal ad / Limited plots remaining ad / Festival offer ad
├── Audience: Retargeted website visitors + WhatsApp engagers + Lookalike
├── Budget: ₹1,000-3,000/day
└── Goal: Direct WhatsApp inquiry → Sales Agent takes over

CAMPAIGN 4: Retargeting (Recovery)
├── Objective: Conversions
├── Creative: Testimonial video / Construction update / Urgency ad
├── Audience: People who clicked but didn't book site visit
├── Budget: ₹300-500/day
└── Goal: Re-engage dropped leads → push to site visit
```

### 2.2 The WhatsApp Sales Agent (The Closer)

> *"India me buyer call nahi uthata. WhatsApp message padhta hai. Isiliye pura sales funnel WhatsApp pe hai."*

**X7 Agent:** `x7-realestate-sales-agent` (Cloud Run)

When a lead messages the project's WhatsApp number (via ad click, website, or referral), the AI Sales Agent takes over:

**The Automated Sales Funnel:**

```
STAGE 1: INSTANT GREETING (< 3 seconds)
───────────────────────────────────────
Lead clicks WhatsApp ad
  → Sales Agent instantly sends:
     "🙏 Namaste! [Project Name] me aapka swagat hai.
      Kya aap investment ke liye dekh rahe hain ya apne liye ghar banana chahte hain?"
     [🏠 Apne liye] [📈 Investment] [📞 Call chahiye]

STAGE 2: QUALIFICATION (Interactive Buttons)
───────────────────────────────────────
Lead selects option
  → Agent asks 3 qualifying questions:
     1. "Budget range kya hai?"
        [₹15-25 Lakh] [₹25-40 Lakh] [₹40 Lakh+]
     2. "Plot size preference?"  
        [1000 sqft] [1500 sqft] [2000+ sqft]
     3. "Kab tak lena chahenge?"
        [Turant] [3 months me] [6 months+]
  
  → Qualification Score calculated:
     Budget ₹40L+ AND Turant = HOT LEAD (🔴)
     Budget ₹25L+ AND 3 months = WARM LEAD (🟡)
     Others = NURTURE (🟢)

STAGE 3: CONTENT DELIVERY (Auto-personalized)
───────────────────────────────────────
Based on qualification:
  → Agent sends:
     ✅ Project brochure PDF (auto-generated with latest prices)
     ✅ Location map with Google Maps pin
     ✅ 30-second walkthrough video (Remotion-generated)
     ✅ RERA registration number + compliance certificate
     ✅ Price list PDF (customized for their budget range)

STAGE 4: SITE VISIT BOOKING
───────────────────────────────────────
Agent pushes for site visit:
  "Sahab, plot dekhna sabse zaroori hai. 
   Kal ka kaunsa time suit karega?"
  [🕐 10 AM] [🕑 2 PM] [🕓 4 PM] [📅 Koi aur din]

  → Site visit booked → saved to CRM
  → Builder gets WhatsApp notification: 
     "New site visit: Rajesh Sharma, 2 PM tomorrow, Budget ₹30L, HOT lead"
  → Day before: Reminder sent to lead
  → Day of: Google Maps direction link sent

STAGE 5: POST-VISIT FOLLOW-UP (Automated Drip)
───────────────────────────────────────
Day 0 (after visit): "Visit kaisa raha? Koi sawal ho toh batayein."
Day 2: Investment comparison chart (Plot vs FD vs Gold — 5 year return)
Day 5: Testimonial video from existing buyer
Day 7: "Sirf 8 plots bache hain. Token amount ₹50,000 se book ho jaata hai."
Day 14: Festival offer / EMI scheme reminder
Day 21: "Kya aapne decide kar liya? Main builder sahab se baat karwa sakta hoon."
Day 30: Final nudge or move to long-term nurture list

STAGE 6: BOOKING & PAYMENT
───────────────────────────────────────
Lead decides to book:
  → Agent sends UPI payment link (₹50K token amount)
  → Payment confirmed → Auto-generates booking receipt PDF
  → Sends congratulations message + next steps
  → Adds to Colony Owner database for post-sale management
```

### 2.3 The Ghost Closer for Real Estate (Outbound Lead Hunting)

Adapted from X7's proven Ghost Closer architecture — now targeting real estate investors:

**Nightly Pipeline (2 AM IST):**
```
1. PROSPECT: Search for HNIs in target city
   → LinkedIn scraping for IT professionals, doctors, NRIs
   → Property portal lead data (99acres, MagicBricks — if API available)
   → Investor databases

2. RESEARCH: For each prospect:
   → Check their LinkedIn for investment interests
   → Check if they've recently searched property in the area
   → Score on Investment Propensity (0-100)

3. COMPOSE: Personalized WhatsApp/Email:
   → "Rajesh ji, aapka Indore me IT sector me career impressive hai.
      Ek investment opportunity share karna chahta hoon — 
      [Area] me RERA approved plots, starting ₹18 Lakh.
      Last 3 years me is area ki property value 40% badhi hai.
      Kya aap 2 minute ka video dekhenge?"

4. SEND: Via WhatsApp Business API / Email
5. LOG: Save to CRM for follow-up tracking
```

### 2.4 The Landing Page Generator

For each project, auto-generates a high-converting landing page:

```
https://buildername.com/[project-name]/

Sections (auto-populated from project data):
├── Hero: Drone shot / AI render + Project name + Starting price + CTA
├── Location: Google Maps embed + distance cards (Hospital: 2km, School: 1km)
├── Gallery: AI-enhanced site photos + Higgsfield renders of completed colony
├── Pricing: Plot-wise pricing table with availability status
├── RERA: Registration number, approvals, legal documents
├── Testimonials: Video testimonials (Higgsfield UGC if real ones not available)
├── FAQ: Auto-generated from common buyer questions
├── Site Visit: Calendar booking widget → syncs to CRM
└── Footer: WhatsApp button + Call button + Location map

Tech: Next.js (SSG) + TailwindCSS + deployed on Vercel
SEO: Auto-optimized for "[Area] me plot", "RERA approved plots in [City]"
```

---

## SECTION 3: THE SALES ENGINE (LEAD TO BOOKING)

> *"Lead aana easy hai. Lead ko convert karna — wahi asli game hai."*

### 3.1 The Builder's CRM Dashboard

**URL:** `app.x7realestate.in/[builder-slug]`  
**Tech:** Next.js 14 + Supabase + TailwindCSS + shadcn/ui

```
Dashboard Layout:
┌─────────────────────────────────────────────────────────────┐
│  📊 TODAY'S KPIs                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │ Leads  │ │ Site   │ │ Book-  │ │ Revenue│ │ Content│    │
│  │ Today  │ │ Visits │ │ ings   │ │ This   │ │ Posted │    │
│  │  12    │ │  3     │ │  1     │ │ Month  │ │ Today  │    │
│  │ ↑ 20%  │ │ ↑ 50%  │ │ ↓ 0%  │ │ ₹18L   │ │  2     │    │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SIDEBAR:              MAIN AREA:                           │
│  ├── 🏠 Dashboard      Lead Pipeline / Content Calendar     │
│  ├── 👥 Leads          (switchable views)                   │
│  ├── 📅 Site Visits                                          │
│  ├── 💰 Bookings                                             │
│  ├── 📱 Content                                              │
│  ├── 📣 Campaigns                                            │
│  ├── 🏘️ Colony Mgmt                                         │
│  ├── 📊 Reports                                              │
│  └── ⚙️ Settings                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Lead Pipeline View (Kanban Board):

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   NEW    │  │QUALIFIED │  │  VISIT   │  │ VISITED  │  │ BOOKED   │
│  (47)    │→ │  (23)    │→ │SCHEDULED │→ │  (12)    │→ │  (5)     │
│          │  │          │  │  (8)     │  │          │  │          │
│ • Rajesh │  │ • Sunil  │  │ • Priya  │  │ • Ankit  │  │ • Deepak │
│   ₹30L   │  │   ₹25L   │  │   ₹40L   │  │   ₹35L   │  │   ₹28L   │
│   HOT 🔴 │  │   WARM🟡 │  │   HOT 🔴 │  │   HOT 🔴 │  │   ✅     │
│ WhatsApp │  │ Meta Ad  │  │ Referral │  │ Website  │  │ Walk-in  │
│ 2 hrs ago│  │ Yesterday│  │ Today 2PM│  │ Liked it │  │ ₹50K paid│
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

#### Content Calendar View:

```
┌─────┬────────────────────────────────────────────────────────┐
│ MON │ 📸 Location Advantage Post    │ Status: ✅ Posted      │
│     │ 🎬 Site Walkthrough Reel      │ Status: 🔄 Rendering  │
├─────┼────────────────────────────────────────────────────────┤
│ TUE │ 📸 Construction Update        │ Status: 📝 Draft      │
│     │ 📊 Investment Comparison Reel │ Status: ⏳ Scheduled   │
├─────┼────────────────────────────────────────────────────────┤
│ WED │ 📸 Educational Carousel       │ Status: ⏳ Scheduled   │
├─────┼────────────────────────────────────────────────────────┤
│ THU │ 🎬 Buyer Testimonial Video    │ Status: 🎯 Generating │
├─────┼────────────────────────────────────────────────────────┤
│ FRI │ 📸 Lifestyle Vision Post      │ Status: 📝 Draft      │
│     │ 🎬 Dream Home Reel           │ Status: ⏳ Scheduled   │
└─────┴────────────────────────────────────────────────────────┘
```

### 3.2 Database Schema

```sql
-- Core Tables
CREATE TABLE builders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  company_name      text NOT NULL,
  phone             text NOT NULL,
  email             text,
  city              text NOT NULL,
  whatsapp_number   text,
  logo_url          text,
  brand_colors      jsonb DEFAULT '{}',
  plan              text DEFAULT 'starter' CHECK (plan IN ('starter','growth','premium')),
  status            text DEFAULT 'active',
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE projects (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id        uuid REFERENCES builders(id),
  name              text NOT NULL,
  slug              text UNIQUE NOT NULL,
  location          text NOT NULL,
  city              text NOT NULL,
  latitude          decimal,
  longitude         decimal,
  total_plots       integer NOT NULL,
  available_plots   integer NOT NULL,
  price_range_min   integer,           -- in Lakhs
  price_range_max   integer,           -- in Lakhs
  rera_number       text,
  project_type      text CHECK (project_type IN ('plots','villas','apartments','commercial','mixed')),
  amenities         text[],            -- ['Wide Roads', 'Garden', 'Security', 'Club House']
  nearby_landmarks  jsonb DEFAULT '[]', -- [{name, type, distance_km}]
  brochure_url      text,
  landing_page_url  text,
  status            text DEFAULT 'active' CHECK (status IN ('pre_launch','active','last_units','sold_out')),
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE plots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid REFERENCES projects(id),
  plot_number        text NOT NULL,
  block             text,
  area_sqft         integer NOT NULL,
  dimension         text,              -- "30x50"
  facing            text,              -- "North", "East", "Corner"
  price_per_sqft    integer,
  total_price       integer,
  status            text DEFAULT 'available' CHECK (status IN ('available','token','booked','registered','sold')),
  booked_by         uuid REFERENCES leads(id),
  token_amount      integer,
  token_date        timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid REFERENCES projects(id),
  builder_id        uuid REFERENCES builders(id),
  name              text NOT NULL,
  phone             text NOT NULL,
  email             text,
  source            text NOT NULL,     -- 'meta_ad', 'google_ad', 'website', 'whatsapp', 'referral', 'walk_in', 'ghost_closer'
  campaign_id       text,              -- Meta/Google campaign ID for attribution
  budget_range      text,              -- '15-25L', '25-40L', '40L+'
  purpose           text,              -- 'self_use', 'investment', 'undecided'
  timeline          text,              -- 'immediate', '3_months', '6_months+'
  lead_score        integer DEFAULT 0, -- 0-100 AI-scored
  lead_stage        text DEFAULT 'new' CHECK (lead_stage IN ('new','qualified','visit_scheduled','visited','negotiation','booked','lost')),
  lost_reason       text,
  assigned_to       text,              -- Sales person name
  notes             text,
  whatsapp_session  jsonb DEFAULT '{}',
  last_contacted_at timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE site_visits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid REFERENCES leads(id),
  project_id        uuid REFERENCES projects(id),
  scheduled_date    date NOT NULL,
  scheduled_time    text NOT NULL,
  status            text DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','no_show','cancelled')),
  feedback          text,
  interest_level    text CHECK (interest_level IN ('very_high','high','medium','low')),
  follow_up_action  text,
  completed_at      timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid REFERENCES leads(id),
  project_id        uuid REFERENCES projects(id),
  plot_id           uuid REFERENCES plots(id),
  token_amount      integer NOT NULL,
  payment_mode      text,              -- 'upi', 'neft', 'cash', 'cheque'
  payment_reference text,
  upi_payment_link  text,
  booking_date      timestamptz DEFAULT now(),
  status            text DEFAULT 'token_paid' CHECK (status IN ('token_paid','agreement','registered','completed','cancelled')),
  created_at        timestamptz DEFAULT now()
);

-- Content & Marketing Tables
CREATE TABLE content_calendar (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid REFERENCES projects(id),
  builder_id        uuid REFERENCES builders(id),
  content_type      text NOT NULL,     -- 'post', 'reel', 'story', 'video', 'ad_creative'
  platform          text NOT NULL,     -- 'instagram', 'facebook', 'youtube', 'google_ads'
  caption           text,
  media_url         text,
  media_type        text,              -- 'image', 'video', 'carousel'
  scheduled_for     timestamptz,
  published_at      timestamptz,
  status            text DEFAULT 'draft' CHECK (status IN ('draft','approved','scheduled','published','failed')),
  engagement        jsonb DEFAULT '{}', -- {likes, comments, shares, saves, reach, impressions}
  virality_score    integer,           -- Higgsfield brain_activity score
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE ad_campaigns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid REFERENCES projects(id),
  builder_id        uuid REFERENCES builders(id),
  platform          text NOT NULL,     -- 'meta', 'google'
  campaign_name     text NOT NULL,
  campaign_type     text,              -- 'awareness', 'consideration', 'conversion', 'retargeting'
  budget_daily      integer,
  budget_spent      integer DEFAULT 0,
  leads_generated   integer DEFAULT 0,
  cpl               integer,           -- Cost per lead
  cpv               integer,           -- Cost per site visit
  status            text DEFAULT 'active',
  meta_campaign_id  text,
  start_date        date,
  end_date          date,
  created_at        timestamptz DEFAULT now()
);

-- Colony Management Tables (Post-Sale)
CREATE TABLE residents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid REFERENCES projects(id),
  plot_id           uuid REFERENCES plots(id),
  name              text NOT NULL,
  phone             text NOT NULL,
  email             text,
  family_members    jsonb DEFAULT '[]',
  vehicles          jsonb DEFAULT '[]',
  move_in_date      date,
  status            text DEFAULT 'owner' CHECK (status IN ('owner','tenant','vacant')),
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE maintenance_invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid REFERENCES projects(id),
  resident_id       uuid REFERENCES residents(id),
  plot_id           uuid REFERENCES plots(id),
  month             text NOT NULL,     -- '2026-06'
  amount            integer NOT NULL,
  due_date          date NOT NULL,
  paid_date         date,
  payment_mode      text,
  upi_payment_link  text,
  status            text DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','waived')),
  late_fee          integer DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE complaints (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid REFERENCES projects(id),
  resident_id       uuid REFERENCES residents(id),
  category          text NOT NULL,     -- 'plumbing', 'electrical', 'road', 'water', 'security', 'cleanliness'
  description       text NOT NULL,
  photo_url         text,
  priority          text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status            text DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  assigned_to       text,
  resolved_at       timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE visitors (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid REFERENCES projects(id),
  resident_id       uuid REFERENCES residents(id),
  visitor_name      text NOT NULL,
  visitor_phone     text,
  purpose           text,
  vehicle_number    text,
  entry_time        timestamptz DEFAULT now(),
  exit_time         timestamptz,
  approval_status   text DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','denied')),
  created_at        timestamptz DEFAULT now()
);
```

---

## SECTION 4: THE COLONY MANAGEMENT ENGINE (POST-SALE VALUE)

> *"Plot sell hone ke baad builder ka kaam shuru hota hai — colony manage karna. Yahi cheez next project ke liye referral laati hai."*

### 4.1 WhatsApp Colony Management (Same as SSMA Architecture)

Reusing the **SSMA (Smart Society Management App)** architecture:

| Feature | How It Works via WhatsApp |
|---|---|
| **Maintenance Billing** | 1st of month: Auto-generated invoices sent to all residents with UPI payment link |
| **Payment Reminders** | Day 10: Gentle reminder. Day 20: Firm reminder. Day 25: Late fee warning |
| **Complaint System** | Resident sends "Pani nahi aa raha" → Ticket created → Plumber notified → Status updates sent |
| **Visitor Management** | Guard enters visitor name → Resident gets WhatsApp: "Ramesh gate pe hai. Allow?" → ✅/❌ buttons |
| **Notices** | Builder sends "Notice: Meeting Sunday 11 AM" → All residents get it instantly |
| **Document Access** | Resident sends "Registry copy" → Bot sends PDF link from document vault |
| **Amenity Booking** | "Clubhouse book karna hai Saturday" → Bot checks availability → Confirms |

### 4.2 Why Colony Management = Next Project Sales

```
Builder manages colony well
  → Residents are happy
    → Residents recommend builder to friends/family
      → Builder gets FREE referral leads for next project
        → Referral close rate: 40-60% (vs 5-10% from ads)
          → Next project sells faster
            → Builder pays for premium plan
```

**This is the flywheel.** Colony management is not a cost center — it is the builder's best lead generation channel.

---

## SECTION 5: THE AGENT ARCHITECTURE (TECHNICAL)

### 5.1 Multi-Agent Backend (Cloud Run)

```
X7 RealEstate Agent Swarm:
├── x7-re-summoner/           → Routes all incoming messages (WhatsApp, Dashboard, Telegram)
├── x7-re-sales-agent/        → Lead qualification, follow-ups, site visit booking
├── x7-re-content-agent/      → Content generation, calendar management, social scheduling
├── x7-re-ads-agent/          → Meta/Google ad creation, budget optimization, reporting
├── x7-re-colony-agent/       → Maintenance billing, complaints, visitor management
├── x7-re-finance-agent/      → Payment tracking, revenue reports, GST invoices
└── x7-re-tool-gateway/       → WhatsApp send, Meta API, Higgsfield CLI, Remotion render, UPI links
    └── tools/
        ├── whatsapp-send.js          — WhatsApp Business API
        ├── meta-ads-create.js        — Meta Marketing API
        ├── higgsfield-generate.js    — Higgsfield CLI wrapper
        ├── remotion-render.js        — Remotion batch render
        ├── upi-link.js              — UPI payment link generator
        ├── pdf-generate.js          — Invoice/brochure/receipt PDFs
        ├── google-maps.js           — Location data, distances
        └── virality-score.js        — Higgsfield brain_activity wrapper
```

### 5.2 Integration Flow

```
                    ┌─────────────────────┐
                    │   BUILDER'S WORLD    │
                    │  (Clients, Buyers)   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
        │ WhatsApp   │   │  Website  │   │  Meta Ads │
        │ Business   │   │ Landing   │   │ Click-to  │
        │   API      │   │  Pages    │   │ WhatsApp  │
        └─────┬──────┘   └─────┬─────┘   └─────┬─────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    X7 SUMMONER      │
                    │  (Intent Router)     │
                    └──────────┬──────────┘
                               │
          ┌────────┬───────┬───┼───┬────────┬────────┐
          │        │       │       │        │        │
     ┌────▼──┐ ┌──▼───┐ ┌─▼──┐ ┌─▼────┐ ┌▼─────┐ ┌▼──────┐
     │ SALES │ │CONTENT│ │ADS │ │COLONY│ │FINANCE│ │ TOOL  │
     │ AGENT │ │AGENT  │ │AGENT│ │AGENT │ │AGENT │ │GATEWAY│
     └───────┘ └──────┘ └────┘ └──────┘ └──────┘ └───────┘
          │        │       │       │        │        │
          └────────┴───────┴───┼───┴────────┴────────┘
                               │
                    ┌──────────▼──────────┐
                    │    SUPABASE DB      │
                    │   (All Data)        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  BUILDER DASHBOARD  │
                    │  (Next.js on Vercel)│
                    └─────────────────────┘
```

---

## SECTION 6: PRICING MODEL

### For Builders (Monthly Subscription)

| Plan | Target | Price | What's Included |
|---|---|---|---|
| **Starter** | Small builder, 1 project | ₹15,000/month | 15 posts/month, 4 videos, WhatsApp Sales Agent, Basic CRM, Site Visit Booking |
| **Growth** | Mid builder, 2-3 projects | ₹35,000/month | 30 posts/month, 12 videos, Meta Ads management, Full CRM, Colony Management, Landing Page |
| **Premium** | Large builder/developer | ₹75,000/month | Unlimited content, All video types (Remotion + Higgsfield), Full ad management, Multi-project CRM, Priority support, Branded dashboard |
| **Enterprise** | Multi-city developer | ₹1,50,000+/month | White-labeled platform, Custom agent workflows, Dedicated account manager, API access |

**One-time setup fee:** ₹10,000-25,000 (includes project onboarding, WhatsApp setup, initial content batch)

### Revenue Projections

| Month | Clients | Avg Revenue/Client | Total MRR |
|---|---|---|---|
| Month 1 | 3 | ₹25,000 | ₹75,000 |
| Month 3 | 8 | ₹30,000 | ₹2,40,000 |
| Month 6 | 15 | ₹35,000 | ₹5,25,000 |
| Month 12 | 30 | ₹40,000 | ₹12,00,000 |
| **Year 1 ARR** | | | **₹1.44 Cr** |

---

## SECTION 7: COMPETITIVE ADVANTAGE

| Feature | X7 RealEstate OS | Typical Digital Agency | Sell.Do CRM | MyGate/NoBrokerHood |
|---|---|---|---|---|
| AI Content Generation | ✅ 60+ pieces/month | ❌ 8-10 manual posts | ❌ No content | ❌ No content |
| Video Production | ✅ Remotion + Higgsfield | ❌ 1-2 manual videos | ❌ No video | ❌ No video |
| WhatsApp Sales Agent | ✅ 24/7 AI-powered | ❌ Human response (9-6) | 🟡 Basic chatbot | ❌ Not for sales |
| Meta Ads AI | ✅ Auto-optimize | 🟡 Manual management | 🟡 Basic integration | ❌ None |
| CRM + Lead Pipeline | ✅ Full Kanban | ❌ No CRM | ✅ Good CRM | ❌ Not for sales |
| Colony Management | ✅ Full SSMA module | ❌ Not offered | ❌ Not offered | ✅ Their core product |
| Virality Scoring | ✅ Pre-publish check | ❌ Not available | ❌ Not available | ❌ Not available |
| Hindi/Regional Content | ✅ Native bilingual | 🟡 English-first | ❌ English only | 🟡 Basic Hindi |
| Pricing | ₹15K-75K/month | ₹30K-1L/month | ₹10K-50K/month | ₹3K-12K/month |
| One Platform | ✅ Content+Sales+Colony | ❌ Only marketing | ❌ Only CRM | ❌ Only colony mgmt |

**The Moat:** No one else offers content generation + sales automation + colony management in ONE platform, powered by AI agents that work 24/7. A builder replaces 3-4 vendors with one X7 subscription.

---

## SECTION 8: THE SALES PITCH (HOW ROHIT SELLS THIS)

### The 5-Minute Builder Demo

**Opening (on phone, standing at a construction site):**

> "Bhai, ek baat batao — tumhare project ki marketing kaun karta hai? Woh digital marketing wale? Unhone last month kitne leads diye? Kitne site visits hua? Kitne book hua? ... Pata nahi na? Yehi problem hai."

**Live Demo (on phone):**

1. Open WhatsApp → Send "Hi" to project number → Show AI Sales Agent responding instantly with brochure, video, pricing — all in 3 seconds
2. Open Instagram → Show 30 days of auto-posted content: reels, carousels, stories — "Ye sab AI bana raha hai. Koi photographer nahi aaya."
3. Open Dashboard → Show lead pipeline: "Ye dekho — kal 12 leads aaye, 3 site visits book hue, 1 booking hua. Sab auto-tracked."
4. Show Remotion video → "Ye 30-second reel AI ne 2 minute me banaya. Tumhare photographer 2 din lagate hain."
5. Show Colony Management → "Aur plot bik jaaye ke baad — residents ka maintenance, complaints, visitor management — sab WhatsApp se. Tumhara next project ke liye ye residents referral denge."

**The Close:**

> "Tumhara ₹2 Cr ka project hai. ₹50 Lakh marketing me jaata hai. Hum ₹35,000 per month me — content, video, ads, sales automation, colony management — sab kuch handle kar rahe hain. Pehle 2 hafte free trial. Agar site visits na badhein, paisa wapas. Deal?"

---

## SECTION 9: BUILD EXECUTION PLAN

### Phase 1: Foundation (Week 1-2)
- [ ] Next.js project setup with Supabase
- [ ] Database schema migration (all tables)
- [ ] Builder onboarding flow
- [ ] Project data entry system
- [ ] Basic dashboard shell (KPIs + sidebar nav)

### Phase 2: Sales Engine (Week 3-4)
- [ ] WhatsApp Business API integration
- [ ] Sales Agent (lead qualification, brochure delivery, site visit booking)
- [ ] Lead pipeline view (Kanban)
- [ ] Site visit management
- [ ] Follow-up automation (drip sequences)

### Phase 3: Content Engine (Week 5-7)
- [ ] Remotion project setup with real estate templates
- [ ] Higgsfield integration (ad creatives, lifestyle renders, UGC videos)
- [ ] Content calendar generation agent
- [ ] Meta Business Suite API (auto-scheduling)
- [ ] Virality scoring pre-publish check
- [ ] Content calendar view in dashboard

### Phase 4: Marketing Engine (Week 8-9)
- [ ] Meta Ads API integration (campaign creation, budget management)
- [ ] Landing page generator (Next.js SSG)
- [ ] Click-to-WhatsApp ad flow
- [ ] Retargeting pixel setup
- [ ] Campaign analytics in dashboard
- [ ] Ghost Closer for Real Estate (outbound lead hunting)

### Phase 5: Colony Management (Week 10-11)
- [ ] Resident management (from SSMA architecture)
- [ ] Maintenance billing + UPI links
- [ ] Complaint system (WhatsApp-based)
- [ ] Visitor management (Guard interface + WhatsApp approval)
- [ ] Notice/broadcast system

### Phase 6: Polish & Launch (Week 12)
- [ ] End-to-end testing with demo project
- [ ] Mobile responsiveness
- [ ] Builder onboarding demo video
- [ ] Sales deck creation
- [ ] First 3 builder onboardings
- [ ] Deploy: Frontend → Vercel, Agents → Cloud Run, DB → Supabase

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
WHATSAPP_VERIFY_TOKEN=

# Meta Marketing API (Ads)
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=

# Google Ads API
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=

# OpenAI (Agent Intelligence)
OPENAI_API_KEY=

# Higgsfield (Visual AI)
# Managed via higgsfield CLI auth

# Agent Security
AGENT_SECRET=

# GCP
GCP_PROJECT_ID=agentverse-summoner-h5jv989fps
GCP_REGION=us-central1

# Razorpay (Payments)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Remotion (Video Rendering)
REMOTION_SERVE_URL=
```

---

## SECTION 11: FILE & FOLDER STRUCTURE

```
/Users/rohit/Projects/x7-realestate/
├── apps/
│   ├── dashboard/                    — Next.js 14 Builder Dashboard
│   │   ├── src/app/
│   │   │   ├── (auth)/login/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── page.tsx          — Main KPI dashboard
│   │   │   │   ├── leads/
│   │   │   │   ├── site-visits/
│   │   │   │   ├── bookings/
│   │   │   │   ├── content/
│   │   │   │   ├── campaigns/
│   │   │   │   ├── colony/
│   │   │   │   ├── reports/
│   │   │   │   └── settings/
│   │   │   └── guard/page.tsx        — Guard interface (mobile)
│   │   └── components/
│   │       ├── leads/ (LeadPipeline, LeadCard, LeadModal)
│   │       ├── content/ (ContentCalendar, ContentCard, MediaPreview)
│   │       ├── colony/ (ResidentTable, ComplaintKanban, VisitorLog)
│   │       └── shared/ (Sidebar, KPICard, StatusBadge, Charts)
│   │
│   └── landing/                      — Next.js SSG Landing Page Generator
│       └── [project-slug]/
│
├── agents/
│   ├── x7-re-summoner/
│   ├── x7-re-sales-agent/
│   ├── x7-re-content-agent/
│   ├── x7-re-ads-agent/
│   ├── x7-re-colony-agent/
│   ├── x7-re-finance-agent/
│   └── x7-re-tool-gateway/
│       └── tools/
│
├── remotion/                         — Remotion Video Templates
│   ├── src/compositions/
│   ├── src/components/
│   ├── src/data/
│   └── public/
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_seed_data.sql
│
├── docs/
│   ├── X7_RealEstate_Blueprint.md    — THIS FILE
│   ├── sales_deck.md
│   └── onboarding_guide.md
│
└── .env.local
```

---

## SECTION 12: SUCCESS METRICS (V1 Launch)

| Metric | Target |
|---|---|
| Content pieces generated per builder per month | 60+ (posts + videos + stories) |
| WhatsApp response time to new lead | < 3 seconds |
| Lead-to-site-visit conversion rate | > 25% |
| Site-visit-to-booking conversion rate | > 15% |
| Content virality score (avg) | > 50/100 |
| Monthly video production per builder | 12+ videos |
| Cost per lead (Meta ads) | < ₹150 |
| Builder onboarding time | < 2 hours |
| First paying client | Within 15 days of launch |
| Month 6 MRR target | ₹5,00,000+ |

---

## APPENDIX A: FUTURE V2 FEATURES

- **NRI Investor Portal** — English-first dashboard for overseas Indian investors
- **3D Virtual Tours** — AI-generated 3D walkthroughs from 2D floor plans
- **Legal Document Vault** — RERA compliance documents, sale deeds, NOCs — all searchable
- **EMI Calculator** — In-WhatsApp EMI calculation with bank partnership
- **Broker Management** — Channel partner portal with commission tracking
- **Multi-Language** — Hindi, Marathi, Gujarati, Tamil, Telugu content generation
- **AR Plot Visualization** — Point phone at empty plot → see AI-rendered house
- **Telegram Bot** — Builder command center via Telegram (Voice + Text)
- **Auto SEO** — Blog posts optimized for "[City] me plot kaise khareedein" type keywords
- **Video Editing Studio** — In-dashboard Remotion editor for custom video tweaks
- **Referral System** — Existing buyers earn cashback for referring new buyers

---

## APPENDIX B: THE BUILDER'S PAIN — DEEP RESEARCH NOTES

### Why Indore Specifically Is Perfect for This Product

1. **450+ unauthorized colonies** seeking regularization — builders need to differentiate with RERA compliance marketing
2. **Super Corridor boom** — ₹12,000-15,000 Cr infrastructure investment creating massive inventory
3. **IT Hub growth** — 50,000+ IT professionals = aspirational buyers who research online
4. **Price appreciation** — 30-40% in 3 years in key corridors, but buyers need content to believe it
5. **"Distance mentality"** — Buyers refuse 4-5km outside city → need marketing to sell peripheral plots
6. **Collector guideline hikes** — Increased stamp duty making buyers hesitant → need urgency marketing
7. **Competition from gold/equity** — Real estate losing to alternative investments → need ROI content
8. **Builder trust deficit** — Unauthorized colonies created fear → need transparency content (RERA, docs, updates)

### The Ideal First Client Profile

```
✅ Builder with 50-200 plot colony
✅ RERA registered (or willing to register)  
✅ In Indore, Bhopal, or nearby Tier 2 city
✅ Currently spending ₹20,000-1,00,000/month on marketing (poorly)
✅ Has smartphone + WhatsApp (obviously)
✅ Has some drone footage or site photos
✅ Open to technology (doesn't need to be tech-savvy)
✅ Has ₹15,000-35,000/month budget for X7
```

---

> *"Har builder ke paas zameen hai, construction team hai, sapna hai. Lekin uske paas marketing machine nahi hai. Hum woh machine hain — AI-powered, 24/7, ₹35K per month."*
>
> — Rohit Kag, Founder, Xero Seven

---

*Document Version: 1.0 | Status: BLUEPRINT READY | Next Step: Review & Improve*
