# WhatsAI Lead-to-Appointment Flow Spec

## Goal

Convert inbound WhatsApp messages or Meta leads into a trackable revenue workflow:
lead created, qualification tracked, appointment/site-visit logged, and hot handoff visible in the dashboard.

## Users

- SMB owner or sales operator using `/conversations`.
- WhatsAI assistant receiving WhatsApp or Meta lead events.
- Dashboard server routes writing tenant-scoped Supabase records.

## Current Behavior

- Public WhatsApp webhook can create a basic `leads` row for unknown inbound numbers.
- Canonical conversations use `conversation_contacts`, `conversation_threads`, and `conversation_messages`.
- Qualification answers, appointments, and handoffs have tables, but the dashboard data loader does not surface their status in the conversation panel.

## Required Behavior

1. Inbound WhatsApp or Meta lead creates/updates one `leads` row scoped by builder and phone.
2. The lead is linked to canonical `conversation_contacts` and `conversation_threads`.
3. Qualification progress is stored in `lead_qualification_answers`.
4. If the message indicates a qualified lead or selected appointment slot, create an `appointments` row.
5. Hot/qualified leads create a `handoff_events` row and set the thread to `pending_human`.
6. `/conversations` right panel shows qualification progress, appointment status, and hot handoff state from canonical tables.

## Scope

In scope:

- Dashboard/server API glue.
- Public Next.js webhook canonical persistence.
- Inbox data-model enrichment and minimal right-panel display.
- Build/type-check verification.

Out of scope:

- Inbox redesign from T3.
- Setup wizard from T4.
- PM2 config or backend agent service config.
- Payment, Razorpay, OpenAI, and content generation.

## Data Model

Existing tables used:

- `leads`
- `conversation_contacts`
- `conversation_threads`
- `conversation_messages`
- `assistant_playbooks`
- `lead_qualification_answers`
- `appointments`
- `handoff_events`

No new migration is required for the MVP because the canonical generic layer already exists.

## Acceptance Criteria

- A dashboard API can ingest an inbound WhatsApp or Meta lead payload and returns `lead`, `thread`, qualification status, appointment status, and handoff status.
- The public WhatsApp webhook calls the same persistence path after resolving builder/project/lead context.
- `/conversations` data reads qualification answers, appointments, and handoffs from Supabase.
- The right panel shows the selected thread's qualification step and appointment status.
- Existing AI reply/manual reply behavior remains unchanged.
- `npm run type-check` and `npm run build` pass.

