# CLAUDE.md - X7 WhatsAI Assistant

## Current Mission

This repo is pivoting from X7 RealEstate OS into X7 WhatsAI Assistant: a WhatsApp-first receptionist, lead qualifier, follow-up, appointment, and owner handoff platform for Indian SMBs.

Do not rebuild from scratch. Preserve the existing real-estate implementation as the first vertical pack: X7 SiteVisit AI.

## Read Order

1. `X7_WhatsAI_Pivot_Strategy.md`
2. `README.md`
3. `project_overview.md`
4. `.docs/ghost-ai/CURRENT_SYSTEM_MAP.md`
5. `.docs/ghost-ai/NEXT_BUILD_PLAN.md`
6. `.docs/ghost-ai/ENV_CONTRACT.md`
7. `.docs/ghost-ai/PRODUCTION_READINESS.md`
8. `X7_RealEstate_Blueprint.md` only for first vertical context

## Architecture Rules

- Summoner-first routing is preferred.
- WhatsApp is the primary customer channel.
- Supabase is the system of record.
- Tool Gateway owns external side effects.
- Generic business/playbook/conversation concepts should be added beside existing real-estate tables.
- Keep old real-estate routes working until generic routes prove parity.

## Product Rules

- Do not sell or expose multi-agent complexity to SMB customers.
- Use customer-facing language: WhatsApp receptionist, instant reply, missed lead recovery, appointment booking, follow-up, owner summary.
- First MVP goal is 10 local business trials, not a complete self-serve SaaS.
