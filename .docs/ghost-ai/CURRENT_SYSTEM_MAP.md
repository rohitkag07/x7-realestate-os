# X7 WhatsAI Assistant - Current System Map

## Repo Shape

- `apps/dashboard`: main operator dashboard
- `agents/x7-re-summoner`: routing, queue orchestration, cron fan-out, central WhatsApp ingress
- `agents/x7-re-sales-agent`: lead qualification, follow-up, and current real-estate assistant logic
- `agents/x7-re-content-agent`: content generation and rendering, deferred for pivot MVP
- `agents/x7-re-ads-agent`: campaign management, deferred for pivot MVP
- `agents/x7-re-ghost-closer`: outbound prospecting, deferred for pivot MVP
- `agents/x7-re-colony-agent`: colony operations, later society/resident vertical pack
- `agents/x7-re-finance-agent`: finance and receipts
- `agents/x7-re-tool-gateway`: shared external execution
- `supabase/migrations`: schema and RLS
- `scripts`: local agent-mesh helpers

## Runtime Pattern

- WhatsApp is the primary customer channel
- dashboard is the operator and owner surface
- Summoner is the preferred routing and orchestration layer
- assistant playbooks define business-specific behavior
- specialist agents own domain logic
- tool-gateway owns shared external execution
- Supabase is the system of record

## Pivot Coverage

The existing codebase already covers the first vertical better than a blank project would:

- real-estate lead capture
- qualification and follow-up logic
- site-visit-style scheduling
- WhatsApp Cloud API paths
- Summoner-first ingress
- dashboard lead/workbench surfaces
- owner/operator readiness surfaces

The generic WhatsAI layer still needs to be built.

## Current Phase Coverage

- Phase 1: dashboard foundation, schema base, shared components
- Phase 2: sales engine core, lead progression, booking-related sales flows, WhatsApp-oriented sales paths
- Phase 5: colony operations core, residents, complaints, visitors, amenities, finance-adjacent paths
- Phase 6: agent mesh, queue orchestration, cron surfaces, Summoner-first ingress
- Pivot P0: documentation and product direction updated to WhatsAI-first

## Current UI Reality

- dashboard and colony surfaces exist and run locally
- several pages can fall back to demo data when Supabase is unavailable
- local operator experience is ahead of verified production wiring
- dashboard still reads mostly as real-estate OS and needs pivot UI copy/surface changes

## Current Completed Areas

- Phase 1 foundation
- major Phase 2 real-estate sales engine
- major Phase 5 colony engine
- major Phase 6 orchestration and local mesh
- pivot documentation layer

## Current Critical Conditional Areas

- live Supabase credentials
- live Meta WhatsApp credentials
- live Razorpay credentials
- production scheduler wiring
- production-quality evidence capture
- generic business/playbook schema and UI
- generic WhatsApp assistant response contract

## Current External Boundaries

- WhatsApp uses Meta Cloud API
- payments use Razorpay webhook and UPI helpers
- content/media depends on OpenAI, Higgsfield, Remotion, and Meta publish paths
- several integrations can simulate locally but still require real credential proof for launch

## Current Routing Rule

Prefer:

- WhatsApp webhook -> Summoner
- dashboard -> Summoner-first helper path
- Summoner -> assistant playbook -> specialist agent
- Tool Gateway for external side effects

Avoid adding new direct routes unless there is a specific reason.
