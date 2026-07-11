# WhatsAI Assistant - Architecture

## Core Pattern

The system follows a WhatsApp-first, Summoner-routed, multi-agent architecture:

- Dashboard is the operator UI
- WhatsApp is the primary customer channel
- Summoner is the preferred central routing layer
- Assistant playbooks define vertical behavior
- Specialist agents handle domain logic
- Tool Gateway owns external API/tool execution
- Supabase is the system of record

## Pivot Architecture Rule

Do not replace the real-estate implementation. Add a generic layer over it.

New generic concepts should be introduced as:

- businesses
- business profiles
- assistant playbooks
- conversation threads
- leads
- appointments
- handoffs
- owner summaries
- trial accounts

Real estate remains a vertical pack until generic routes prove parity.

## Agent Roles

- `x7-re-summoner`: routing, WhatsApp ingress, orchestration, cron fan-out
- `x7-re-sales-agent`: current lead qualification engine and first generic assistant base
- `x7-re-tool-gateway`: WhatsApp send, payment links, PDF/media helpers
- `x7-re-content-agent`: deferred content generation
- `x7-re-ads-agent`: deferred campaign operations
- `x7-re-ghost-closer`: deferred outbound prospecting
- `x7-re-colony-agent`: society/resident vertical pack, not first MVP wedge
- `x7-re-finance-agent`: payment confirmation, receipts, subscription support

## Data Flow

1. customer message enters through WhatsApp webhook
2. Summoner resolves business context from phone/channel/default trial config
3. Summoner selects assistant playbook and target agent
4. target agent replies or asks qualification question
5. Tool Gateway sends external WhatsApp/payment/PDF actions
6. results are written back to Supabase
7. dashboard shows lead, thread, appointment, and handoff state
8. owner receives hot-lead handoff or daily summary

## Current Architectural Rule

Prefer Summoner-first routing for new integration work. Do not add new direct point-to-point agent paths unless there is a clear reason.
