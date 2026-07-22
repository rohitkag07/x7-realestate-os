# WhatsAI Business Knowledge Base Workflow

## Product rule

WhatsAI uses a hybrid, owner-controlled response policy:

1. Safety guardrails and transactional keyword rules run first.
2. Published business knowledge is searched second.
3. Only the exact owner-approved answer is sent.
4. No match or low confidence creates a human handoff.

No LLM is required for this workflow. Google Open Knowledge Format (OKF) is
used as the portable source format, not as the runtime database.

## Owner workflow

1. Open **Knowledge** from the sidebar.
2. Add a title, customer question, search keywords, and exact approved answer.
3. Optionally record the source URL and language.
4. Test the entry against a customer message.
5. Publish only after reviewing the answer.
6. WhatsAI immediately uses published entries for that business and playbook.

## Runtime flow

```text
WhatsApp inbound
  -> phone_number_id -> business_channels -> business_id
  -> mandatory safety handoff check
  -> exact transactional keyword rules
  -> published assistant_knowledge_items for business_id
  -> conservative deterministic match
  -> owner-approved answer OR human handoff
  -> Tool Gateway WhatsApp send
  -> canonical conversation_messages audit
```

## OKF mapping

Each knowledge item can be represented as `knowledge/<okf_slug>.md` with YAML
frontmatter:

```yaml
---
title: Consultation fees
kind: pricing
business_id: <tenant uuid>
playbook_id: <playbook uuid>
locale: hinglish
status: published
keywords:
  - fees
  - consultation charge
source_type: manual
last_reviewed_at: 2026-07-23T00:00:00.000Z
---

Our consultation fee is Rs 500. Appointments are available Monday to Saturday.
```

## Safety and tenancy

- Every query is filtered by `business_id` and the active `playbook_id`.
- Draft and archived entries are never used at runtime.
- Prices, medical information, policies, and appointments remain exact,
  owner-approved text.
- Source metadata and review timestamps make stale facts visible.
- Future Gemini File Search support can be added behind a feature flag without
  changing the OKF source contract.
