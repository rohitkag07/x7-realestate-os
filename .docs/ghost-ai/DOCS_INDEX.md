# X7 RealEstate OS Docs Index

This repo has two documentation layers:

1. reference docs
2. working build docs

Do not rewrite the long reference docs unless Rohit explicitly asks for a blueprint rewrite.

## Reference Docs

| File | Purpose |
| --- | --- |
| `/Users/rohit/Documents/Claude/Projects/X7 Real estate/X7_RealEstate_Blueprint.md` | Master product vision, modules, flows, and long-form architecture. Use this when product intent or a phase definition is unclear. |
| `/Users/rohit/Documents/Claude/Projects/X7 Real estate/X7_Evolution_Blueprint.md` | Shared X7 patterns, deployment ideas, and cross-project architecture thinking. |
| `/Users/rohit/Documents/Claude/Projects/X7 Real estate/SSMA.md` | Colony and society-management detail that still informs Phase 5 behavior. |
| `progress_tracker.md` | Root shorthand tracker for humans. Useful for quick orientation, not detailed implementation history. |

## Working Build Docs

Read these first when continuing the repo:

| File | Purpose |
| --- | --- |
| `CURRENT_SYSTEM_MAP.md` | Current apps, agents, database, routes, and what is actually implemented now. |
| `LOCAL_RUNBOOK.md` | Local start commands, ports, verification, and smoke checks. |
| `ENV_CONTRACT.md` | Exact environment variable contract by app and agent, derived from current code. |
| `DEPLOYMENT_CHECKLIST.md` | Step-by-step deploy and verification checklist for dashboard, agents, webhooks, and payments. |
| `NEXT_BUILD_PLAN.md` | The next highest-leverage build order. |
| `PRODUCTION_READINESS.md` | What is real, simulated, blocked, or still awaiting live credentials. |
| `progress_tracker.md` | Working build archive inside `.docs/ghost-ai`. Use for status and handoff history. |

## Recommended Reading Order

1. `DOCS_INDEX.md`
2. `CURRENT_SYSTEM_MAP.md`
3. `LOCAL_RUNBOOK.md`
4. `ENV_CONTRACT.md`
5. `NEXT_BUILD_PLAN.md`
6. `PRODUCTION_READINESS.md`
7. `DEPLOYMENT_CHECKLIST.md`
8. `progress_tracker.md` only when old implementation history is needed
9. `X7_RealEstate_Blueprint.md` only when repo state and blueprint intent diverge

## Rule For Future Agents

Do not dump long phase logs into every doc.

- Update `CURRENT_SYSTEM_MAP.md` only when the actual system shape changes.
- Update `LOCAL_RUNBOOK.md` only when commands, ports, or smoke checks change.
- Update `ENV_CONTRACT.md` when env variables change in code.
- Update `DEPLOYMENT_CHECKLIST.md` when the rollout procedure changes.
- Update `NEXT_BUILD_PLAN.md` by removing completed items and adding the next concrete build targets.
- Keep historical detail inside `.docs/ghost-ai/progress_tracker.md`.
