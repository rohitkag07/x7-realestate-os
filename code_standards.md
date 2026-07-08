# X7 WhatsAI Assistant - Code Standards

## Product-Specific Standards

- Preserve backwards compatibility with current real-estate flows until generic WhatsAI parity is proven.
- Add generic business/playbook/conversation models beside existing tables before migration.
- Prefer explicit vertical metadata over hard-coded real-estate assumptions.
- Keep WhatsApp webhook handling deterministic and auditable.
- Persist all lead-changing events.
- Keep owner handoff and manual takeover paths simple.

## General Standards

- TypeScript for app code where available.
- Express services expose `/health`.
- Supabase is the system of record.
- `x-agent-secret` protects inter-service calls.
- Avoid broad refactors during pivot work unless needed for the specific migration step.
