# X7 RealEstate OS - AI Workflow Rules

## Working Order

1. read `.docs/ghost-ai/DOCS_INDEX.md`
2. read `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`
3. read `.docs/ghost-ai/NEXT_BUILD_PLAN.md`
4. inspect the code that matches the current task
5. implement the smallest high-leverage change
6. verify with build, type-check, health, or HTTP proof
7. update docs when repo reality changes

## Build Rules

- prefer reducing conditional risk over adding decorative features
- prefer one central path over many duplicate paths
- keep sales, colony, content, ads, and orchestration consistent
- keep env-dependent behavior explicit in docs

## Verification Rules

- do not call a phase complete from file presence alone
- use command output or HTTP checks where practical
- if runtime verification is inconclusive, say so clearly

## Documentation Rules

- root docs should stay concise
- `.docs/ghost-ai` should be the fast operational layer
- blueprint remains the master narrative and repo status snapshot
