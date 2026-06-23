# X7 RealEstate OS - Architecture

## Core Pattern

The system follows a multi-agent architecture:

- Dashboard is the operator UI
- Summoner is the preferred central routing layer
- Specialist agents handle domain logic
- Tool Gateway owns external API/tool execution
- Supabase is the system of record

## Agent Roles

- `x7-re-summoner`: routing, orchestration, cron fan-out, central ingress
- `x7-re-sales-agent`: qualification, follow-up, visit booking, brochure sends
- `x7-re-content-agent`: content calendar, rendering, scoring, publishing
- `x7-re-ads-agent`: campaign creation, insights, optimization, CAPI queue
- `x7-re-ghost-closer`: outbound prospecting and outreach batches
- `x7-re-colony-agent`: complaints, visitors, notices, amenities, billing reminders
- `x7-re-finance-agent`: payment confirmation, receipts, monthly summaries
- `x7-re-tool-gateway`: WhatsApp send, UPI links, PDF generation, media helpers

## Data Flow

1. user or webhook enters through dashboard or Summoner
2. Summoner resolves intent and target agent
3. target agent performs business logic
4. Tool Gateway is used when external side effects are needed
5. results are written back to Supabase
6. dashboard reads Supabase-first with fallback behavior where applicable

## Current Architectural Rule

Prefer Summoner-first routing for new integration work. Do not add new direct point-to-point agent paths unless there is a clear reason.
