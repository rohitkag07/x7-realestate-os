# X7 RealEstate OS - Claude Context

This project is X7 RealEstate OS, codename Project NEEV.

## Read First

Use the working docs before reading long historical files:

1. `.docs/ghost-ai/DOCS_INDEX.md`
2. `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`
3. `.docs/ghost-ai/LOCAL_RUNBOOK.md`
4. `.docs/ghost-ai/ENV_CONTRACT.md`
5. `.docs/ghost-ai/NEXT_BUILD_PLAN.md`
6. `.docs/ghost-ai/PRODUCTION_READINESS.md`
7. `.docs/ghost-ai/DEPLOYMENT_CHECKLIST.md`

## Important Rule

Do not rewrite these files unless Rohit explicitly asks:

- `X7_RealEstate_Blueprint.md`
- `.docs/ghost-ai/progress_tracker.md`

Treat the blueprint as product vision plus repo snapshot. Treat the progress tracker as the working build archive.

## Current Project Shape

- Dashboard app: `apps/dashboard`
- Agents: `agents/x7-re-*`
- Remotion project: `remotion`
- Supabase migrations: `supabase/migrations`
- Local orchestration scripts: `scripts/start-phase6-local.sh`, `scripts/check-phase6-local.sh`, `scripts/stop-phase6-local.sh`

## Current Direction

The next work should focus on reducing conditional behavior:

- verify live Supabase wiring
- harden Summoner-first WhatsApp ingress
- improve production orchestration and deployment readiness
- keep docs simple and accurate
