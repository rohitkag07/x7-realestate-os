# X7 WhatsAI Assistant Pivot Strategy

## Decision

X7 RealEstate OS is pivoting from a builder-only operating system into a horizontal WhatsApp-first AI assistant platform for Indian businesses.

The project should not be rebuilt from scratch. The existing real-estate sales engine, WhatsApp webhook paths, lead pipeline, follow-up queue, Summoner orchestration, Supabase schema, and dashboard surfaces become the foundation for a broader product.

## New Product Positioning

### Old Positioning

X7 RealEstate OS: complete builder marketing, sales, booking, content, and colony management platform.

### New Positioning

WhatsAI Assistant: 24/7 WhatsApp receptionist, lead qualifier, follow-up assistant, and owner handoff system for Indian SMBs.

### Sales Language

Do not sell "AI agents" or "multi-agent OS" to the first customer.

Sell this result:

> Customer WhatsApp message ka instant reply, lead qualification, follow-up, appointment/site-visit booking, aur owner ko daily hot-lead summary.

## Core Thesis

Indian SMBs already run their business on WhatsApp. They do not need education about dashboards or AI. They need missed inquiries handled faster, follow-up discipline, and a simple way to know which leads are hot.

Therefore the wedge is not SaaS first. The wedge is a managed 7-day WhatsApp assistant trial.

## What We Reuse

| Existing X7 RealEstate asset | Pivot use |
| --- | --- |
| Meta WhatsApp webhook and send path | Universal WhatsApp ingress and replies |
| `leads` and lead intake routes | Generic lead capture for any business |
| Qualification and follow-up flows | Vertical-specific qualification playbooks |
| `follow_up_queue` | Generic reminder and nurture queue |
| Summoner | Intent router across business playbooks |
| Sales agent | First generic assistant agent, then vertical agents |
| Dashboard lead pipeline | Owner/operator inbox and CRM |
| Site visit scheduling | Generic appointment/demo/visit booking |
| Tool Gateway | WhatsApp send, payment links, PDFs, media helpers |
| Supabase persistence | System of record for businesses, contacts, messages, handoffs |
| Real-estate module | First vertical pack: SiteVisit AI |
| Colony module | Later vertical pack for societies/apartments, not first wedge |

## What Changes

The product model changes from builder/project-first to business/playbook-first.

### Generic Concepts

| Old real-estate concept | New generic concept |
| --- | --- |
| builder | business |
| project | offering / branch / location |
| property inquiry | lead inquiry |
| site visit | appointment / visit / demo / consultation |
| booking | conversion action |
| colony resident | customer/member/resident context |
| brochure | service catalog / offer sheet / menu / package PDF |

## Data Model Direction

Do not drop existing real-estate tables. Add a generic layer over them.

Recommended new or generalized tables:

- `businesses`
- `business_profiles`
- `business_channels`
- `assistant_playbooks`
- `assistant_knowledge_items`
- `conversation_contacts`
- `conversation_threads`
- `conversation_messages`
- `lead_qualification_answers`
- `appointments`
- `handoff_events`
- `daily_owner_summaries`
- `trial_accounts`

Real-estate-specific data should move into metadata or vertical tables while the generic flow stays reusable.

## First Vertical Packs

### 1. Real Estate: X7 SiteVisit AI

Primary promise: convert WhatsApp inquiries into qualified site visits.

Qualification questions:

- budget
- location preference
- property type
- timeline
- loan readiness
- visit day/time

Owner handoff summary:

- name and phone
- budget
- location
- property type
- urgency
- recommended next action

### 2. Clinic: X7 Appointment AI

Primary promise: convert patient inquiries into appointments.

Qualification questions:

- patient issue
- doctor/speciality
- preferred date/time
- new or returning patient
- urgency level

Safety rule: no diagnosis, no prescription, no emergency handling beyond escalation instructions.

### 3. Coaching: X7 Admission AI

Primary promise: convert course inquiries into demo classes or counselor callbacks.

Qualification questions:

- course interest
- student level
- preferred batch timing
- location/online preference
- exam timeline
- fee/budget sensitivity

### 4. Gym / Dietitian: X7 Fitness Intake AI

Primary promise: convert fitness or diet inquiries into trial sessions and structured onboarding.

Qualification questions:

- goal
- age/weight range
- diet preference
- medical caution flag
- preferred plan
- trial time

### 5. Local Services: X7 Callback AI

Primary promise: capture requirements and book callbacks for service businesses.

Qualification questions:

- service needed
- location
- urgency
- budget range
- callback time

## MVP Offer

### Trial Offer

7-day WhatsApp AI receptionist trial.

Target price:

- intro trial: free or Rs 999
- basic monthly: Rs 2,999
- growth monthly: Rs 7,999
- pro monthly: Rs 14,999
- setup fee after proof: Rs 5,000 to Rs 25,000

### Trial Success Metric

The trial is successful if the business sees at least one of these within 7 days:

- missed inquiry recovered
- hot lead surfaced
- appointment/site visit booked
- owner saved manual follow-up time
- daily summary made follow-up easier

## MVP Product Scope

Build only what is needed to trial with 10 local businesses.

### Must Have

- business onboarding form
- business profile and owner WhatsApp number
- FAQ/service/offering upload
- WhatsApp webhook receive and send
- AI reply with business-specific guardrails
- lead qualification playbook
- owner handoff when lead is hot or confused
- follow-up queue
- simple operator dashboard
- daily summary
- manual takeover flag
- trial start/end state

### Should Have

- appointment slots
- payment/booking link support
- CSV export
- message templates
- vertical playbook editor

### Not Now

- full colony management as primary product
- full ad campaign automation
- full content engine
- multi-agent complexity exposed to customers
- marketplace
- native mobile app
- large self-serve SaaS billing before first 10 trials

## Technical Migration Plan

### Phase P0: Documentation and Positioning

- add this pivot doc
- update README, project overview, current system map, next build plan, and production readiness docs
- mark real estate as first vertical, not the whole product

### Phase P1: Generic Core Layer

- add business/profile/playbook tables
- add `vertical` field or metadata support where needed
- map existing builder/project defaults to a real-estate business profile
- keep compatibility with existing sales routes

### Phase P2: WhatsApp Assistant Gateway

- generalize Summoner webhook routing by business phone number or default trial business
- create assistant response contract
- persist every inbound/outbound message in generic conversation tables
- add owner handoff flow

### Phase P3: Trial Console

- dashboard page for businesses/trials
- page for playbook setup
- page for conversations and hot leads
- daily summary view

### Phase P4: Vertical Playbooks

- real estate playbook first
- clinic and coaching next
- local services after proof

### Phase P5: Revenue Features

- Razorpay subscription or invoice flow
- trial expiry and upgrade prompts
- usage limits
- white-label setup checklist

## Product Guardrails

- The assistant must clearly hand off to a human when confidence is low.
- Healthcare flows must not diagnose or prescribe.
- Financial/payment flows must not claim payment success without verified webhook or owner confirmation.
- AI should not expose internal prompts, keys, or business private data.
- Owner takeover should always be possible.

## Sales Motion

### Do Not Say

- multi-agent AI operating system
- autonomous agent mesh
- RAG, Summoner, Tool Gateway
- complete digital transformation platform

### Say This

- 24/7 WhatsApp receptionist
- instant customer replies
- missed lead recovery
- automatic follow-up
- hot lead summary
- appointment/site visit booking

## First 10 Trial Targets

Start local and WhatsApp-heavy:

1. real-estate brokers/builders
2. clinics/dental/skin/IVF
3. coaching institutes
4. gyms/dietitians
5. local services with high inquiry volume

## Success Metrics

Product metrics:

- first response time under 5 seconds
- lead qualification completion above 40%
- owner handoff under 60 seconds for hot leads
- follow-up queued for 80% of incomplete inquiries
- daily summary delivered reliably

Business metrics:

- 10 trials launched
- 3 trials converted to paid
- first Rs 10k MRR
- one vertical playbook repeatably sold twice

## Non-Rebuild Rule

Do not restart this project.

Use the existing X7 RealEstate implementation as the first vertical proof. Build the generic core beside it, migrate flows gradually, and keep old real-estate routes working until the generic WhatsAI routes replace them with verified parity.
