# WhatsAI Assistant Docs Index

This repo has two documentation layers:

1. pivot and working build docs
2. long reference docs from the pre-pivot real-estate product

## Start Here

| File | Purpose |
| --- | --- |
| `WHATSAI_PIVOT_STRATEGY.md` | Master pivot decision, business model, reusable architecture, MVP scope, and migration plan. |
| `README.md` | Current project entrypoint and positioning. |
| `project_overview.md` | Short product overview for the new WhatsAI direction. |
| `CURRENT_SYSTEM_MAP.md` | Current apps, agents, database direction, and what is actually implemented now. |
| `NEXT_BUILD_PLAN.md` | The next highest-leverage build order for the pivot. |
| `ENV_CONTRACT.md` | Runtime environment variable contract. |
| `PRODUCTION_READINESS.md` | What is real, simulated, blocked, or still awaiting live proof. |
| `DEPLOYMENT_CHECKLIST.md` | Step-by-step deploy and verification checklist. |
| `progress_tracker.md` | Working build archive and status history. |

## Reference Docs

These remain useful, but read them as pre-pivot context unless a section was explicitly updated with a pivot note.

| File | Purpose |
| --- | --- |
| `.docs/legacy/realestate-vertical-blueprint.md` | Original builder OS blueprint and first vertical pack reference. |
| `.docs/legacy/evolution-blueprint.md` | Shared X7 agent/platform history and cross-project architecture thinking. |
| `SSMA.md` | Society/colony management detail for later resident vertical pack. |
| `.docs/legacy/revenue-engines.md` | Pre-pivot revenue engine thinking and automation assets. |
| `.docs/legacy/superprojects-portfolio.md` | Portfolio reference, not primary product direction. |

## Recommended Reading Order

1. `WHATSAI_PIVOT_STRATEGY.md`
2. `README.md`
3. `project_overview.md`
4. `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`
5. `.docs/ghost-ai/NEXT_BUILD_PLAN.md`
6. `.docs/ghost-ai/ENV_CONTRACT.md`
7. `.docs/ghost-ai/PRODUCTION_READINESS.md`
8. `.docs/ghost-ai/DEPLOYMENT_CHECKLIST.md`
9. `.docs/ghost-ai/progress_tracker.md`
10. `.docs/legacy/realestate-vertical-blueprint.md` only for real-estate vertical behavior

## Rule For Future Agents

Do not restart or rewrite the product from scratch.

- Preserve existing real-estate flows while adding the generic WhatsAI layer.
- Update `CURRENT_SYSTEM_MAP.md` only when the actual system shape changes.
- Update `LOCAL_RUNBOOK.md` only when commands, ports, or smoke checks change.
- Update `ENV_CONTRACT.md` when env variables change in code.
- Update `DEPLOYMENT_CHECKLIST.md` when the rollout procedure changes.
- Update `NEXT_BUILD_PLAN.md` by removing completed items and adding the next concrete build targets.
- Keep historical detail inside `.docs/ghost-ai/progress_tracker.md`.
