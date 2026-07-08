# X7 WhatsAI Assistant - Next Build Plan

## Priority Order

1. generic WhatsAI core layer
2. first trial-ready WhatsApp flow
3. real-estate vertical parity as SiteVisit AI
4. production verification proof
5. secondary vertical playbooks

## Best Next Technical Moves

### 1. Add Generic Business and Playbook Layer

- add tables for businesses, profiles, channels, playbooks, knowledge items, trials, conversations, appointments, handoffs, and summaries
- map existing builder/project defaults to a real-estate business profile
- keep current real-estate tables working
- add migration notes so old flows are not broken

### 2. Generalize WhatsApp Ingress

- route inbound WhatsApp messages by phone/channel/business context
- if no business match exists, use a configured trial/default business
- persist inbound/outbound messages in generic conversation tables
- keep current Summoner webhook verification and signature validation behavior

### 3. Create Assistant Response Contract

- define response types: answer, ask_qualification, appointment_offer, handoff, fallback, stop
- define required metadata: confidence, lead_stage, next_question, handoff_reason, follow_up_at
- enforce vertical guardrails, especially healthcare no-diagnosis rules

### 4. Build Trial Console

- business onboarding form
- playbook setup form
- FAQ/service/offering input
- conversations and hot leads view
- owner handoff settings
- 7-day trial state
- daily summary surface

### 5. Real Estate As First Vertical Pack

- rename customer-facing language to X7 SiteVisit AI
- use existing lead, visit, booking, and follow-up logic
- prove one flow: inbound WhatsApp inquiry -> qualification -> site visit/handoff -> dashboard lead -> follow-up queue

### 6. Production Proof

- prove live Supabase write path
- prove live Summoner-first WhatsApp ingress
- prove at least one outbound WhatsApp reply
- prove daily summary or follow-up queue execution
- capture evidence packet

### 7. Secondary Vertical Playbooks

After real-estate parity:

- clinic appointment playbook
- coaching admission playbook
- gym/dietitian intake playbook
- local service callback playbook

## What Not To Build Next

- full colony management as primary product
- full ad automation
- full content factory
- mobile app
- marketplace
- complex self-serve billing before 10 trials
- large refactor that breaks existing real-estate flow
