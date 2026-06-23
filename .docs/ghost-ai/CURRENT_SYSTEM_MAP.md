# X7 RealEstate OS - Current System Map

## Repo Shape

- `apps/dashboard`: main operator dashboard
- `agents/x7-re-summoner`: routing, queue orchestration, cron fan-out, central webhook ingress
- `agents/x7-re-sales-agent`: sales qualification and follow-up
- `agents/x7-re-content-agent`: content generation and rendering
- `agents/x7-re-ads-agent`: campaign management
- `agents/x7-re-ghost-closer`: outbound prospecting
- `agents/x7-re-colony-agent`: colony operations
- `agents/x7-re-finance-agent`: finance and receipts
- `agents/x7-re-tool-gateway`: shared external execution
- `supabase/migrations`: schema and RLS
- `scripts`: local agent-mesh helpers

## Runtime Pattern

- dashboard is the operator surface
- Summoner is the preferred routing and orchestration layer
- specialist agents own domain logic
- tool-gateway owns shared external execution
- Supabase is the system of record

## Current Phase Coverage

- Phase 1: dashboard foundation, schema base, shared components
- Phase 2: sales engine core, lead progression, booking-related sales flows, WhatsApp-oriented sales paths
- Phase 5: colony operations core, residents, complaints, visitors, amenities, finance-adjacent colony paths
- Phase 6: agent mesh, queue orchestration, cron surfaces, Summoner-first ingress

## Current UI Reality

- dashboard and colony surfaces exist and run locally
- several pages can fall back to demo data when Supabase is unavailable
- local operator experience is ahead of verified production wiring

## Current Completed Areas

- Phase 1 foundation
- major Phase 2 sales engine
- major Phase 5 colony engine
- major Phase 6 orchestration and local mesh

## Current Critical Conditional Areas

- live Supabase credentials
- live Meta WhatsApp credentials
- live Razorpay credentials
- production scheduler wiring
- production-quality evidence capture

## Current External Boundaries

- WhatsApp uses Meta Cloud API
- payments use Razorpay webhook and UPI helpers
- content/media depends on OpenAI, Higgsfield, Remotion, and Meta publish paths
- several integrations can simulate locally but still require real credential proof for launch

## Current Routing Rule

Prefer:

- dashboard -> Summoner-first helper path
- webhooks -> Summoner-first
- Summoner -> specialist agents

Avoid adding new direct routes unless there is a specific reason.
