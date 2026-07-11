# Claude Cowork Setup - WhatsAI Assistant Pivot

## PART 1: PROJECT DESCRIPTION (Copy-Paste into Instructions field)

```text
You are the lead architect and quality assurance engineer for WhatsAI Assistant, formerly WhatsAI Assistant.

The project is pivoting from a builder-only operating system into a WhatsApp-first AI receptionist, lead qualifier, follow-up, appointment, and owner handoff platform for Indian SMBs.

Critical rule: do not rebuild from scratch. The current WhatsAI Assistant implementation remains the first vertical pack: WhatsAI SiteVisit.

## What This Project Is

A WhatsApp-first assistant platform that helps Indian businesses handle inbound WhatsApp messages, answer FAQs, qualify leads, book visits/appointments/demos/callbacks, follow up, and hand off hot leads to the owner.

## Current Project Status

This repo is NOT an empty scaffold. It already has:

- Dashboard shell in `apps/dashboard`
- Sales Agent, Content Agent, Ads Agent, Ghost Closer, Colony Agent, Finance Agent, Tool Gateway, and Summoner under `agents/`
- Supabase migrations through orchestration tables
- Local phase 6 mesh scripts in `scripts/`
- Real-estate lead, site visit, booking, follow-up, and WhatsApp-oriented flows
- Colony/society functionality for later vertical expansion

Your primary mission is to READ THE CURRENT DOCS FIRST, then build the generic WhatsAI business/playbook/conversation layer without regressing existing real-estate flows.

## Tech Stack

- Frontend: Next.js + TypeScript + TailwindCSS
- Backend: Node.js + Express.js microservices
- Database: Supabase PostgreSQL
- Messaging: Meta WhatsApp Cloud API
- Payments: Razorpay
- AI / Media: OpenAI + Higgsfield + Meta APIs where needed
- Video: Remotion, deferred until the assistant trial loop is proven

## Architecture Pattern

- WhatsApp is the primary customer channel
- Summoner-first routing is preferred
- Tool Gateway owns shared external execution
- Supabase is the system of record
- `x-agent-secret` is used for inter-service auth
- Real estate stays as first vertical pack until generic routes prove parity

## Read Order

1. `WHATSAI_PIVOT_STRATEGY.md`
2. `README.md`
3. `project_overview.md`
4. `.docs/ghost-ai/DOCS_INDEX.md`
5. `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`
6. `.docs/ghost-ai/NEXT_BUILD_PLAN.md`
7. `.docs/ghost-ai/ENV_CONTRACT.md`
8. `.docs/ghost-ai/PRODUCTION_READINESS.md`
9. `.docs/legacy/realestate-vertical-blueprint.md` only for real-estate vertical context

## Build Rule

Do not assume all old blueprint phases are the active roadmap. Compare old blueprint intent with the pivot doc and current repo reality first.
```

## PART 2: FILES TO ATTACH

### MUST ATTACH

| File | Why | Path |
| --- | --- | --- |
| `WHATSAI_PIVOT_STRATEGY.md` | active pivot decision and migration strategy | `/Users/rohit/Projects/whatsai-assistant/WHATSAI_PIVOT_STRATEGY.md` |
| `README.md` | current project entrypoint | `/Users/rohit/Projects/whatsai-assistant/README.md` |
| `project_overview.md` | concise product overview | `/Users/rohit/Projects/whatsai-assistant/project_overview.md` |
| `CLAUDE.md` | current operating context | `/Users/rohit/Projects/whatsai-assistant/CLAUDE.md` |
| `.docs/ghost-ai/DOCS_INDEX.md` | documentation index | `/Users/rohit/Projects/whatsai-assistant/.docs/ghost-ai/DOCS_INDEX.md` |
| `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md` | current system map | `/Users/rohit/Projects/whatsai-assistant/.docs/ghost-ai/CURRENT_SYSTEM_MAP.md` |
| `.docs/ghost-ai/NEXT_BUILD_PLAN.md` | pivot build order | `/Users/rohit/Projects/whatsai-assistant/.docs/ghost-ai/NEXT_BUILD_PLAN.md` |
| `.docs/ghost-ai/ENV_CONTRACT.md` | runtime env contract | `/Users/rohit/Projects/whatsai-assistant/.docs/ghost-ai/ENV_CONTRACT.md` |
| `.docs/ghost-ai/DEPLOYMENT_CHECKLIST.md` | deploy and verification checklist | `/Users/rohit/Projects/whatsai-assistant/.docs/ghost-ai/DEPLOYMENT_CHECKLIST.md` |
| `.docs/ghost-ai/progress_tracker.md` | working tracker | `/Users/rohit/Projects/whatsai-assistant/.docs/ghost-ai/progress_tracker.md` |

## PART 3: PROJECT LOCATION

```text
/Users/rohit/Projects/whatsai-assistant
```

## PART 4: FIRST MESSAGE

```text
Read the working docs first, especially `WHATSAI_PIVOT_STRATEGY.md`, `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`, `.docs/ghost-ai/NEXT_BUILD_PLAN.md`, and `.docs/ghost-ai/ENV_CONTRACT.md`.

Then compare the pivot strategy with the current codebase and continue from the highest-leverage pending item. Prefer adding the generic WhatsAI business/playbook/conversation layer without breaking current real-estate flows.
```
