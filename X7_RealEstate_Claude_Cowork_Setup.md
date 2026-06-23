# 🛠️ Claude Cowork Setup — X7 RealEstate OS (Project NEEV)

---

## PART 1: PROJECT DESCRIPTION (Copy-Paste into "Instructions" field)

```text
You are the lead architect and quality assurance engineer for X7 RealEstate OS (Codename: Project NEEV — नींव) — a full-stack AI-powered platform for Tier 2 Indian builders.

## What This Project Is
An end-to-end SaaS platform for builder marketing, sales, and colony management. The current repo already contains a meaningful build across dashboard, sales flows, colony flows, and Phase 6 agent orchestration.

## Current Project Status (CRITICAL)
This repo is NOT an empty scaffold. It already has:
- Dashboard shell in `apps/dashboard`
- Sales Agent, Content Agent, Ads Agent, Ghost Closer, Colony Agent, Finance Agent, Tool Gateway, and Summoner under `agents/`
- Supabase migrations through `008_agent_orchestration.sql`
- Local phase 6 mesh scripts in `scripts/`

Your primary mission is to READ THE CURRENT DOCS FIRST, then build or harden the next highest-leverage missing piece without regressing the existing system.

## Tech Stack (Strict)
- Frontend: Next.js + TypeScript + TailwindCSS
- Backend: Node.js + Express.js microservices
- Database: Supabase PostgreSQL
- Video: Remotion
- AI / Media: OpenAI + Higgsfield + Meta APIs
- Messaging: Meta WhatsApp Cloud API
- Payments: Razorpay

## Architecture Pattern
- Summoner-first routing is preferred
- Tool Gateway owns shared external execution
- Supabase is the system of record
- `x-agent-secret` is used for inter-service auth

## Read Order
1. `.docs/ghost-ai/DOCS_INDEX.md`
2. `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`
3. `.docs/ghost-ai/ENV_CONTRACT.md`
4. `.docs/ghost-ai/NEXT_BUILD_PLAN.md`
5. `X7_RealEstate_Blueprint.md`

## Build Rule
Do not assume phases are missing from the blueprint alone. Always compare blueprint with current repo reality first.
```

---

## PART 2: FILES TO ATTACH

### MUST ATTACH

| File | Why | Path |
| --- | --- | --- |
| `X7_RealEstate_Blueprint.md` | master blueprint plus repo status snapshot | `/Users/rohit/Documents/Claude/Projects/X7 Real estate/X7_RealEstate_Blueprint.md` |
| `README.md` | current project entrypoint | `/Users/rohit/Documents/Claude/Projects/X7 Real estate/README.md` |
| `CLAUDE.md` | current operating context | `/Users/rohit/Documents/Claude/Projects/X7 Real estate/CLAUDE.md` |
| `.docs/ghost-ai/DOCS_INDEX.md` | documentation index | `/Users/rohit/Documents/Claude/Projects/X7 Real estate/.docs/ghost-ai/DOCS_INDEX.md` |
| `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md` | current system map | `/Users/rohit/Documents/Claude/Projects/X7 Real estate/.docs/ghost-ai/CURRENT_SYSTEM_MAP.md` |
| `.docs/ghost-ai/ENV_CONTRACT.md` | runtime env contract | `/Users/rohit/Documents/Claude/Projects/X7 Real estate/.docs/ghost-ai/ENV_CONTRACT.md` |
| `.docs/ghost-ai/DEPLOYMENT_CHECKLIST.md` | deploy and verification checklist | `/Users/rohit/Documents/Claude/Projects/X7 Real estate/.docs/ghost-ai/DEPLOYMENT_CHECKLIST.md` |
| `.docs/ghost-ai/NEXT_BUILD_PLAN.md` | next build order | `/Users/rohit/Documents/Claude/Projects/X7 Real estate/.docs/ghost-ai/NEXT_BUILD_PLAN.md` |
| `.docs/ghost-ai/progress_tracker.md` | working tracker | `/Users/rohit/Documents/Claude/Projects/X7 Real estate/.docs/ghost-ai/progress_tracker.md` |

---

## PART 3: PROJECT LOCATION

```text
/Users/rohit/Documents/Claude/Projects/X7 Real estate
```

---

## PART 4: FIRST MESSAGE

```text
Read the working docs first, especially `.docs/ghost-ai/DOCS_INDEX.md`, `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`, `.docs/ghost-ai/ENV_CONTRACT.md`, and `.docs/ghost-ai/NEXT_BUILD_PLAN.md`.

Then compare the blueprint with the current codebase and continue from the highest-leverage pending item. Prefer reducing conditional or production-risk gaps before adding new surface area.
```
