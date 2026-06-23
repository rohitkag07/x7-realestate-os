# X7 RealEstate OS

X7 RealEstate OS is a full-stack AI operating system for Tier 2 Indian real estate builders. It combines sales CRM, WhatsApp qualification, booking workflows, content generation, campaign operations, colony management, and agent orchestration.

Codename: Project NEEV.

## Main App

| App | Path | Purpose |
| --- | --- | --- |
| Dashboard | `apps/dashboard` | Builder dashboard for leads, site visits, bookings, content, campaigns, colony ops, reports, and settings. |

## Backend Agents

Agents live in `agents/`:

- `x7-re-summoner`
- `x7-re-tool-gateway`
- `x7-re-sales-agent`
- `x7-re-content-agent`
- `x7-re-ads-agent`
- `x7-re-ghost-closer`
- `x7-re-colony-agent`
- `x7-re-finance-agent`

## Documentation

Start here:

- `.docs/ghost-ai/DOCS_INDEX.md`
- `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`
- `.docs/ghost-ai/LOCAL_RUNBOOK.md`
- `.docs/ghost-ai/ENV_CONTRACT.md`
- `.docs/ghost-ai/NEXT_BUILD_PLAN.md`
- `.docs/ghost-ai/PRODUCTION_READINESS.md`
- `.docs/ghost-ai/DEPLOYMENT_CHECKLIST.md`

Long reference docs:

- `X7_RealEstate_Blueprint.md`
- `.docs/ghost-ai/progress_tracker.md`
- `X7_RealEstate_Claude_Cowork_Setup.md`

## Local Setup

Install dependencies inside the app or agent you are working on:

```bash
npm install
```

Run dashboard:

```bash
cd apps/dashboard
npm run dev
```

Run the agent mesh:

```bash
./scripts/start-phase6-local.sh
./scripts/check-phase6-local.sh
./scripts/check-rollout-readiness.sh
```

Stop the local mesh:

```bash
./scripts/stop-phase6-local.sh
```

## Production Notes

- Supabase is the system of record.
- Summoner is the preferred central routing layer.
- Meta WhatsApp, Razorpay, and other paid integrations can stay in simulated/local mode until real credentials are available.
- Before production launch, follow `.docs/ghost-ai/PRODUCTION_READINESS.md`.
- Use `npm run phase-a:check` from repo root for one-shot rollout proof:
  - git + Vercel link present
  - env files populated
  - local services reachable
  - dashboard readiness endpoints reachable
  - WhatsApp Graph token validity
  - Summoner webhook verify-token challenge
