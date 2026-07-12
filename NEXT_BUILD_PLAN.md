# WhatsAI Assistant — Next Build Plan

**Decision date:** 12 July 2026  
**Product strategy:** Zero-LLM, deterministic WhatsApp receptionist for Indian SMBs  
**Initial market:** Clinics, gyms, real estate businesses, coaching institutes, salons/spas, and local services  
**Initial commercial target:** 10 founder-sold businesses, then 100 businesses only after the first cohort is operationally stable

## Execution Status — 12 July 2026

- T1–T7 implemented and verified in the canonical repository.
- Migrations `012_dynamic_keyword_engine.sql` and `013_seed_dynamic_keyword_playbooks.sql` applied to the connected Supabase project.
- Three existing active playbooks backfilled; each has three tenant-owned rules and one active playbook per business.
- Dynamic engine enabled for the internal PM2 runtime; Sales Agent, Tool Gateway, and Summoner are online.
- Controlled T8 rollout has started. The required 48-hour live observation and additional Spa/Clinic pilot traffic remain time-based rollout gates and must not be reported as complete before evidence exists.

## Executive Verdict

WhatsAI Assistant is not ready to sell safely to arbitrary businesses today.

The frontend creates the impression of a configurable assistant, but the runtime reply path is still coupled to five hardcoded vertical playbooks. A Spa owner can complete setup successfully and still receive a reply generated from the wrong vertical. That is a production correctness bug and a trust-breaking sales risk, not a minor missing feature.

The Zero-LLM strategy is sensible for the first 10 businesses, but only if we position the product honestly as a **managed, rule-based WhatsApp receptionist**. Keyword automation is not a defensible technology advantage: WATI and Interakt already offer shared inboxes, keyword/chatbot automation, assignment, campaigns, and CRM workflows. Our near-term advantage must be the outcome: a local business is configured for them, gets predictable replies, captures leads, books appointments, and can hand conversations to a human without learning a complex platform.

The next build must make Supabase the single source of truth for every business's live reply rules.

---

## 1. Hard Business Review

### 1.1 Zero-LLM strategy: where it is strong

For the first 10 founder-managed customers, a deterministic engine is a good constraint:

- Replies are predictable and auditable.
- No hallucinated pricing, medical advice, discounts, availability, or promises.
- No LLM token bill and no model-provider dependency.
- Business owners can approve the exact text that customers receive.
- Hindi, Hinglish, and English variants can be written explicitly.
- Bugs can be reproduced from the input message, playbook version, and matched rule.

This is especially appropriate for repetitive high-intent questions such as fees, timings, location, trial class, doctor availability, site visit, membership, cancellation policy, and callback requests.

### 1.2 Zero-LLM strategy: where it is weak

The product must not be marketed as an assistant that “understands anything.” A keyword engine will fail on:

- Unexpected wording, spelling mistakes, voice notes, and long multi-question messages.
- Context-dependent follow-ups such as “what about tomorrow?”
- Negation such as “I am not asking about fees.”
- Multiple matching rules in one message.
- Requests that require live inventory, doctor availability, or staff judgment.

Therefore, unmatched or ambiguous messages must trigger a deterministic fallback and optional human handoff. The product promise should be: **instant answers to configured questions, structured qualification, appointment capture, and safe human takeover.**

### 1.3 The ₹0 variable-cost claim is too broad

“Exactly ₹0 variable API cost” is not a safe business assumption.

- Interakt's current pricing page lists service messages as free but separately prices marketing, authentication, and utility messages. [Interakt pricing](https://www.interakt.shop/pricing-us/)
- WATI's India PAYG documentation lists 1,000 service conversations per month for that WATI plan, while its Growth plan has different limits. This is evidence that “1,000 free” is not a universal, permanent product assumption we should hardcode into our unit economics. [WATI PAYG vs Growth](https://support.wati.io/en/articles/12136628-understanding-difference-between-wati-s-pay-as-you-go-payg-and-growth-plans)
- Hosting, Supabase, logging, monitoring, phone-number operations, support, onboarding, and failed-message recovery still cost money or founder time.

The correct target is **near-zero model cost**, not zero operating cost. Finance should track contribution margin after Meta message charges, infrastructure, and support labour.

### 1.4 Market position versus WATI and Interakt

WATI already advertises official WhatsApp onboarding, a team inbox, campaigns, keyword actions, chatbot automation, integrations, and analytics. [WATI feature comparison](https://www.wati.io/en/pricing-comparison/)

Interakt advertises centralised WhatsApp conversations, sales pipelines, automatic lead assignment, chatflows, custom fields/tags, and sales reporting. Its Growth plan is currently shown around ₹2,499/month and Advanced around ₹3,499/month on the India-facing pricing pages. [Interakt pricing](https://www.interakt.shop/princing-stater/) [Interakt Sales CRM](https://www.interakt.shop/sales-crm/)

WhatsAI should not compete on feature count in Phase 1. The offer should be narrower:

> “We set up your WhatsApp receptionist in one working session. It answers your top questions exactly, captures qualified leads, books callbacks/visits, and alerts you when a human should take over.”

### 1.5 Pricing verdict

The proposed pricing is viable for a service-led pilot:

- One-time setup: **₹2,999**
- Monthly managed service: **₹1,499**
- 10-business cohort: **₹29,990** setup revenue + **₹14,990 MRR**
- 100-business base: **₹299,900** setup revenue + **₹149,900 MRR**

The setup fee is justified only if it includes a real deliverable: WhatsApp connection, up to 20–30 approved keyword rules, one qualification flow, one appointment/callback flow, and an end-to-end test.

The monthly retainer must have a strict scope:

- One WhatsApp number
- One active playbook
- One owner/operator seat during the pilot
- Up to 30 active keyword rules
- One monthly rule-update batch
- Dashboard, lead capture, appointment capture, and human handoff
- Business-hours support, not unlimited custom development
- Meta/template charges billed separately or explicitly excluded

The projected 90% margin is not credible if founder labour is excluded. At 10 businesses this is a managed service. Measure onboarding hours, monthly support minutes, failed-message incidents, and customer-requested rule changes before claiming software margins.

### 1.6 Go-to-market gates

Do not run paid ads for 100 businesses until all of these are true for the first 10:

1. At least 95% of configured test phrases produce the approved reply.
2. Zero cross-business reply leakage across a 30-day period.
3. At least 80% of inbound conversations receive either a matched reply or a visible human handoff within 60 seconds.
4. Median onboarding time is under 60 minutes after Meta credentials are available.
5. Monthly founder support is under 30 minutes per active business.
6. Every outbound reply is visible in the canonical conversation history.

---

## 2. Verified Current Technical State

Verified against the canonical repository on 12 July 2026.

| Surface | Current behaviour | Evidence | Risk |
|---|---|---|---|
| Setup wizard | Collects assistant goal, knowledge, qualification questions, and persona/instructions | `src/components/whatsai/WhatsAiSetupForm.tsx:29-60`, `326-340` | UI implies free-form intelligence that the runtime does not use |
| Setup API | Writes a business, channel, playbook, and knowledge item to Supabase | `src/app/api/whatsai/setup/route.ts:91-170` | Saved configuration is not the sales-agent runtime source |
| Playbook schema | Migration defines `system_prompt`, `qualification_questions`, `handoff_rules`, and `is_active` | `supabase/migrations/009_generic_core_layer.sql:91-102` | Setup route/types use a different field vocabulary (`goal`, `tone`, `active`, etc.); schema drift must be reconciled first |
| Summoner | Resolves `phone_number_id` to business context, finds the active playbook, creates canonical contact/thread/message records | `agents/x7-re-summoner/index.js:400-416`, `900-1033` | This part is directionally correct and must remain tenant-scoped |
| Summoner routing | Non-real-estate goes to `/playbook/qualify`; real estate goes to `/qualify` | `agents/x7-re-summoner/index.js:1035-1060`, `1089-1102` | Two runtime paths make consistent dynamic behaviour harder |
| Sales Agent | Imports `getPlaybook`, `getNextQuestion`, and `computeTemperature` from a JavaScript file | `agents/x7-re-sales-agent/index.js:6-10` | Hardcoded code, not tenant data, controls replies |
| Generic qualification | Calls `getPlaybook(vertical)` and hardcoded rule helpers | `agents/x7-re-sales-agent/index.js:666-770` | Unknown businesses or custom playbooks cannot work correctly |
| Trial seed | Imports the hardcoded coaching playbook | `scripts/seed-trial-business.js:157-161` | Deleting the file immediately would break seed/proof tooling |

### Root cause

Two playbook systems were built at different times:

1. A database playbook system for multi-business configuration.
2. A code-based vertical playbook system for deterministic demos.

The Summoner partially adopted the database system, but the Sales Agent retained the code system. The setup wizard writes to system 1 while live replies are generated by system 2.

---

## 3. Target Architecture: Dynamic Keyword Engine

### 3.1 Canonical data flow

```text
Meta WhatsApp webhook
  -> Summoner validates signature and reads phone_number_id
  -> business_channels resolves business_id
  -> canonical contact/thread/inbound message is persisted
  -> Summoner sends business_id + playbook_id + thread_id + message to Sales Agent
  -> Sales Agent fetches the active assistant_playbooks row from Supabase
  -> mandatory platform safety rules run first
  -> deterministic keyword engine selects one approved reply
  -> if no match: deterministic qualification question or configured fallback/handoff
  -> Tool Gateway sends WhatsApp reply
  -> canonical outbound conversation_messages row is persisted exactly once
```

### 3.2 Non-negotiable architecture rules

- `business_id` is required for every dynamic reply decision.
- The active playbook must be queried by `business_id` or by a `playbook_id` already proven to belong to that business.
- The vertical name is metadata, not the reply source.
- WhatsApp sending continues only through Tool Gateway.
- Inbound and outbound canonical conversation writes remain intact.
- A database failure must never fall back to another business or a generic vertical playbook.
- A missing/invalid playbook produces a safe fallback plus a human handoff event.
- Manual takeover or paused AI means no automated reply.
- Arbitrary user-authored regular expressions are not allowed in Phase 1. The engine may compile escaped keyword strings into safe internal regex patterns; this prevents regex denial-of-service and accidental broad matches.

### 3.3 Keyword-reply JSON contract

Add a dedicated `keyword_replies jsonb` column to `assistant_playbooks`. Do not overload `qualification_questions` or `handoff_rules`.

```json
[
  {
    "id": "fees",
    "label": "Fees",
    "keywords": ["fees", "fee", "monthly fee", "price"],
    "match_type": "word",
    "reply": "Our monthly fee is Rs 1,500. Would you like to book a trial visit?",
    "priority": 100,
    "enabled": true,
    "handoff": false
  }
]
```

Rule constraints:

- `id`: lowercase slug, unique within the playbook
- `label`: 1–60 characters
- `keywords`: 1–20 non-empty strings; each 1–80 characters
- `match_type`: `exact`, `word`, or `contains`; default `word`
- `reply`: 1–1,000 characters
- `priority`: integer 0–1,000; higher wins
- `enabled`: boolean
- `handoff`: boolean; if true, create a handoff after sending the reply
- Maximum 30 active rules in the pilot plan

Matching order:

1. Normalize input using Unicode NFKC, lowercase, trimmed whitespace, and punctuation folding.
2. Run mandatory platform safety/handoff checks.
3. Sort enabled rules by priority descending and stable array order.
4. Evaluate `exact`, then `word`, then `contains` rules at equal priority.
5. First deterministic match wins.
6. Store `playbook_id`, `rule_id`, normalized input, and match type in outbound message metadata.
7. If no rule matches, continue the configured qualification state or send `fallback_reply` and open a handoff when configured.

### 3.4 Database migration

Create `supabase/migrations/012_dynamic_keyword_engine.sql`.

```sql
ALTER TABLE public.assistant_playbooks
  ADD COLUMN IF NOT EXISTS keyword_replies jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fallback_reply text NOT NULL
    DEFAULT 'Thanks for your message. Our team will reply shortly.',
  ADD COLUMN IF NOT EXISTS playbook_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.assistant_playbooks
  ADD CONSTRAINT assistant_playbooks_keyword_replies_array
  CHECK (jsonb_typeof(keyword_replies) = 'array');

CREATE INDEX IF NOT EXISTS assistant_playbooks_business_active_lookup
  ON public.assistant_playbooks (business_id, updated_at DESC)
  WHERE is_active = true;
```

Before adding a one-active-playbook uniqueness rule, audit production for duplicate active rows. If duplicates exist, retain the newest active row and disable older rows inside the migration transaction. Then add:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS assistant_playbooks_one_active_per_business
  ON public.assistant_playbooks (business_id)
  WHERE is_active = true;
```

The migration must also resolve the current schema vocabulary drift. The canonical runtime fields should be `system_prompt` (deprecated but retained), `qualification_questions`, `keyword_replies`, `fallback_reply`, `handoff_rules`, and `is_active`. The setup route and TypeScript types must stop assuming undocumented columns unless production introspection proves they exist and a migration adds them to source control.

### 3.5 Frontend: Step 3 redesign

Replace “Assistant goal,” “FAQs and knowledge base,” and “Assistant instructions/persona” with an operator-friendly rule editor:

- Section title: **Keywords & Auto-Replies**
- Explanation: “Add the words customers commonly send and the exact reply WhatsAI should send.”
- Repeatable rule card:
  - Rule name
  - Keyword chips (comma or Enter to add)
  - Match type (`Whole word` default, `Exact message`, `Contains phrase`)
  - Exact reply textarea
  - Enabled switch
  - “Send to owner after reply” switch
  - Delete rule
- “Add another reply” button
- Live tester: type a sample customer message and preview the matched rule/reply before saving
- Fallback reply field
- Keep qualification questions as a separate optional deterministic sequence
- Validation prevents duplicate IDs, empty keywords/replies, more than 30 active rules, and duplicate keywords at the same priority

The wizard should ship with editable starter templates per category, but those templates must be copied into the form and saved to Supabase. They must not remain runtime code dependencies.

### 3.6 Backend: Sales Agent redesign

Add two small modules rather than growing `index.js` further:

1. `agents/x7-re-sales-agent/playbook-store.js`
   - `loadActivePlaybook({ businessId, playbookId })`
   - Select only the canonical fields.
   - Verify `playbook_id` belongs to `business_id`.
   - Return a structured `playbook_not_found`, `playbook_inactive`, or `playbook_query_failed` result.
   - Phase 1 reads Supabase on every inbound message as requested. Add timing metrics before considering a short TTL cache.

2. `agents/x7-re-sales-agent/keyword-engine.js`
   - `normalizeMessage(text)`
   - `validateKeywordRules(value)`
   - `matchKeywordRule({ message, rules })`
   - No I/O and no business-specific constants.
   - Deterministic tie-breaking and safe Unicode handling.

Refactor `agents/x7-re-sales-agent/index.js` so the inbound response function:

1. Requires `business_id` and `thread_id`.
2. Loads the active playbook from Supabase.
3. Checks manual/pause state before replying.
4. Runs mandatory safety checks.
5. Runs the keyword matcher.
6. Sends the exact saved `reply` through Tool Gateway.
7. Records canonical outbound metadata with the matched rule.
8. If unmatched, advances database-backed qualification questions or sends the configured fallback and creates a handoff.

### 3.7 Summoner routing change

The current real-estate/non-real-estate split should be removed after the new endpoint is proven. All business inbound messages should use one deterministic Sales Agent endpoint, for example `POST /playbook/respond`, with:

```json
{
  "business_id": "uuid",
  "playbook_id": "uuid",
  "thread_id": "uuid",
  "contact_id": "uuid",
  "phone": "+91...",
  "message": "fees kya hai",
  "send_via_whatsapp": true
}
```

This removes vertical branching from the runtime. `vertical` remains useful for onboarding templates and safety policy selection, but never chooses hardcoded business content.

### 3.8 Safe retirement of `vertical-playbooks.js`

Do not delete the file first. It is currently imported by both the Sales Agent and trial seed script.

Delete it only after:

1. Starter templates are represented as plain JSON/TypeScript seed data used only by the wizard/seed process.
2. Sales Agent no longer imports it.
3. `scripts/seed-trial-business.js` no longer imports it.
4. All qualification and temperature logic has a database-backed deterministic replacement.
5. Unit and live tests pass for at least two businesses in different verticals.

---

## 4. Step-by-Step Execution Roadmap

### T0 — Prove and freeze the current contract

- [ ] Query production `assistant_playbooks` columns and active-row counts per business.
- [ ] Save a redacted sample of one active playbook for migration testing.
- [ ] Confirm manual/paused threads do not call the automated response path.
- [ ] Add baseline test: Spa message currently receives wrong/no vertical reply.
- [ ] Record current webhook-to-reply latency and failure rate.

**Files/read surfaces:**

- `supabase/migrations/009_generic_core_layer.sql`
- `src/types/database.ts`
- `src/app/api/whatsai/setup/route.ts`
- `agents/x7-re-summoner/index.js`
- `agents/x7-re-sales-agent/index.js`

### T1 — Make the database contract canonical

- [ ] Add `supabase/migrations/012_dynamic_keyword_engine.sql`.
- [ ] Add `keyword_replies`, `fallback_reply`, `playbook_version`, lookup index, JSON array constraint, and one-active-playbook protection.
- [ ] Reconcile `is_active` versus `active`, and migration fields versus TypeScript/API fields.
- [ ] Update `AssistantPlaybook` and add a typed `KeywordReplyRule` in `src/types/database.ts`.
- [ ] Add a shared Zod contract in `src/lib/keyword-reply-schema.ts` for the dashboard setup API.
- [ ] Apply migration to a local/test Supabase project first, then production.

### T2 — Replace Step 3 with the rule editor

- [ ] Create `src/components/whatsai/KeywordReplyEditor.tsx`.
- [ ] Modify `src/components/whatsai/WhatsAiSetupForm.tsx` form state and Step 3.
- [ ] Remove `persona` and free-form LLM language from validation/copy.
- [ ] Add starter rules for real estate, clinic, coaching, gym, salon/spa, and local services as onboarding-only templates.
- [ ] Add a live deterministic message tester in the browser.
- [ ] Modify `src/app/api/whatsai/setup/route.ts` to validate and upsert `keyword_replies` and `fallback_reply`.
- [ ] Change setup from always-insert to safe one-active-playbook upsert.
- [ ] Update readiness summary to show rule count and tested sample count.

### T3 — Build the deterministic engine as pure code

- [ ] Create `agents/x7-re-sales-agent/keyword-engine.js`.
- [ ] Add normalization, rule validation, priority sorting, exact/word/contains matching, and deterministic tie-breaking.
- [ ] Create `agents/x7-re-sales-agent/keyword-engine.test.js` using Node's built-in test runner.
- [ ] Add tests for English, Hindi, Hinglish, punctuation, casing, multiple matches, disabled rules, blank inputs, and unsafe regex-like characters.
- [ ] Add a medical-emergency safety test proving safety rules run before business keywords.

### T4 — Connect the Sales Agent to Supabase playbooks

- [ ] Create `agents/x7-re-sales-agent/playbook-store.js`.
- [ ] Modify `agents/x7-re-sales-agent/index.js` to load the active playbook by tenant on every inbound request.
- [ ] Add `POST /playbook/respond` and reuse existing Tool Gateway send logic.
- [ ] Persist match metadata on canonical outbound messages.
- [ ] Add fallback/handoff behavior for missing, invalid, inactive, or unavailable playbooks.
- [ ] Ensure no automated reply is sent in manual/paused mode.
- [ ] Add structured logs: `business_id`, `playbook_id`, `playbook_version`, `rule_id`, `match_type`, decision latency, and outcome. Never log access tokens or full customer PII.

### T5 — Unify Summoner routing

- [ ] Modify `agents/x7-re-summoner/index.js` to pass `playbook_id` and route all business inbound messages to `/playbook/respond`.
- [ ] Remove the real-estate versus non-real-estate runtime branch.
- [ ] Preserve channel-to-business tenant resolution and canonical inbound writes.
- [ ] Ensure one webhook event creates one inbound row and at most one automated outbound row.
- [ ] Keep WhatsApp sends through Tool Gateway only.

### T6 — Migrate seeds and retire hardcoded playbooks

- [ ] Move onboarding starter content to `src/lib/starter-keyword-rules.ts` or a neutral JSON seed file.
- [ ] Modify `scripts/seed-trial-business.js` to insert keyword rules directly instead of importing agent runtime code.
- [ ] Update proof scripts and setup documentation.
- [ ] Remove all imports of `vertical-playbooks.js`.
- [ ] Delete `agents/x7-re-sales-agent/vertical-playbooks.js` only after the reference search returns zero.

### T7 — Automated proof

- [ ] Create `scripts/prove-dynamic-keyword-engine.js`.
- [ ] Seed two businesses with conflicting `fees` replies.
- [ ] Send the same phrase through each business channel context.
- [ ] Assert each business receives only its own exact reply.
- [ ] Assert unmatched input sends the configured fallback and opens a handoff when enabled.
- [ ] Assert manual takeover suppresses the bot.
- [ ] Assert outbound messages contain `rule_id` and `playbook_version` metadata.
- [ ] Add the proof script to `package.json` as `prove:keyword-engine`.

### T8 — Controlled rollout

- [ ] Deploy to one internal business and run 30 scripted phrases.
- [ ] Add one Spa/Salon and one Clinic pilot with deliberately overlapping keywords.
- [ ] Monitor for 48 hours before adding the remaining pilot businesses.
- [ ] Maintain a rollback feature flag, `DYNAMIC_KEYWORD_ENGINE_ENABLED`, during rollout.
- [ ] Roll back by disabling the flag and switching affected threads to human takeover; do not restore cross-tenant hardcoded replies.

---

## 5. Exact File Order

| Order | File | Action |
|---:|---|---|
| 1 | `supabase/migrations/012_dynamic_keyword_engine.sql` | Add canonical keyword-rule storage and active-playbook indexes |
| 2 | `src/types/database.ts` | Add `KeywordReplyRule` and align `AssistantPlaybook` with migration columns |
| 3 | `src/lib/keyword-reply-schema.ts` | Shared dashboard/API validation contract |
| 4 | `src/lib/starter-keyword-rules.ts` | Onboarding-only starter templates, including salon/spa |
| 5 | `src/components/whatsai/KeywordReplyEditor.tsx` | Repeatable keyword/reply editor and tester |
| 6 | `src/components/whatsai/WhatsAiSetupForm.tsx` | Replace persona/knowledge Step 3 and update validation/readiness |
| 7 | `src/app/api/whatsai/setup/route.ts` | Validate and upsert canonical playbook fields |
| 8 | `agents/x7-re-sales-agent/keyword-engine.js` | Pure deterministic matcher |
| 9 | `agents/x7-re-sales-agent/keyword-engine.test.js` | Matcher unit tests |
| 10 | `agents/x7-re-sales-agent/playbook-store.js` | Tenant-scoped Supabase playbook loader |
| 11 | `agents/x7-re-sales-agent/index.js` | Dynamic respond endpoint and persistence integration |
| 12 | `agents/x7-re-summoner/index.js` | Pass playbook identity and unify routing |
| 13 | `scripts/seed-trial-business.js` | Remove runtime playbook-file dependency |
| 14 | `scripts/prove-dynamic-keyword-engine.js` | Multi-tenant end-to-end proof |
| 15 | `package.json` | Add unit/proof commands |
| 16 | `.env.example` and agent `.env.example` | Add rollout flag only; no LLM keys |
| 17 | `README.md` and `WHATSAI_RUNBOOK.md` | Document rule-based positioning, setup, proof, and rollback |
| 18 | `agents/x7-re-sales-agent/vertical-playbooks.js` | Delete last, after zero references and passing proof |

---

## 6. Testing Pyramid

| Layer | Required tests | Minimum |
|---|---|---:|
| Unit | Normalization, match types, priority, Unicode, invalid rules, safety precedence | 15 |
| API | Setup validation/upsert, 30-rule limit, duplicate active playbook, tenant ownership | 6 |
| Agent integration | Load playbook, matched reply, fallback, DB failure, paused thread, Tool Gateway call | 8 |
| Multi-tenant | Same keyword, different businesses, no cross-tenant data/reply leakage | 3 |
| E2E | Meta-shaped inbound → canonical write → matched outbound → dashboard visibility | 3 |
| Live pilot | 30 scripted messages per pilot business across at least 3 verticals | 90 messages |

## 7. Acceptance Criteria

1. A Spa business can create and activate at least five keyword/reply rules without editing code.
2. An inbound `fees` message for that Spa returns exactly the Spa's saved reply.
3. The same `fees` message sent to a Real Estate business returns that business's different saved reply.
4. No Sales Agent reply path imports or reads `vertical-playbooks.js`.
5. `rg "vertical-playbooks" agents scripts src` returns zero runtime/seed references before the file is deleted.
6. Every automated reply records `business_id`, `playbook_id`, `playbook_version`, and `rule_id` in structured logs or message metadata.
7. Missing or unavailable playbooks never use another tenant's rule and produce a safe fallback/handoff.
8. Manual/paused threads produce zero automated outbound replies.
9. Tool Gateway remains the only WhatsApp-send integration.
10. Existing canonical inbound/outbound conversation persistence remains intact.
11. `npm run type-check`, `npm run build`, Sales Agent unit tests, and `npm run prove:keyword-engine` pass.
12. The setup UI contains no LLM persona/OpenAI/Gemini requirement.
13. No OpenAI/Gemini key is needed to boot or prove the Phase 1 product.
14. p95 keyword-decision latency is measured and remains under 750 ms excluding Meta delivery time.
15. The first three pilot businesses pass all approved phrase tests before rollout expands.

---

## 8. Failure Modes and Required Behaviour

| Failure | Required behaviour |
|---|---|
| `business_id` missing | Do not auto-reply; log routing error and create operational alert |
| Active playbook missing | Send tenant-safe generic fallback only if business policy permits; otherwise handoff |
| Supabase timeout | No hardcoded vertical fallback; handoff and retry operationally |
| Invalid JSON rules | Reject setup/update; keep the previous active playbook unchanged |
| Multiple keyword matches | Highest priority, then match specificity, then stable array order |
| Manual takeover | Suppress all bot replies |
| Clinic emergency keyword | Platform safety message and urgent handoff override business rule |
| Tool Gateway send failure | Preserve decision log, mark outbound failed, expose retry to operator |
| Duplicate webhook | Idempotency by provider message ID; no duplicate reply |
| Cross-business playbook ID | Reject the request and log a tenant-boundary violation |

---

## 9. Rollback Plan

1. Keep the schema additions backward-compatible; do not drop existing columns in this release.
2. Gate the new Sales Agent path with `DYNAMIC_KEYWORD_ENGINE_ENABLED` during the pilot.
3. If replies fail, disable automation for affected businesses and move threads to human takeover.
4. Revert the application release without reverting the additive migration.
5. Do not restore hardcoded cross-vertical replies as the fallback. The safe rollback is human handling plus exact manual replies.
6. Keep `vertical-playbooks.js` until the new path has passed multi-tenant proof and at least 48 hours of controlled live traffic; delete it in a separate final cleanup commit.

---

## 10. Commercial Packaging After the Fix

### Pilot offer

**₹2,999 Setup + ₹1,499/month**

Included:

- WhatsApp Cloud API connection assistance
- Up to 30 keyword/reply rules
- One qualification flow
- One appointment/callback workflow
- Shared inbox and human takeover
- One rule-update batch per month
- Monthly performance summary

Excluded or separately billed:

- Meta template-message charges
- Marketing broadcasts/campaign operations
- More than one WhatsApp number
- Custom third-party integrations
- Unlimited content/rule revisions
- LLM-generated free-form answers

### Sales claim we can make after acceptance passes

> “WhatsAI sends only the replies you approve. It answers common WhatsApp questions instantly, captures leads, books appointments, and hands unusual conversations to you.”

Do not claim that it understands arbitrary questions, replaces all staff, has zero total operating cost, or delivers 90% profit margin until real cohort data proves those statements.

---

## Definition of Done

The build is complete when a newly onboarded business in an unsupported category such as Spa can configure its own rules, receive the correct deterministic replies through the real WhatsApp webhook, see those replies in the dashboard, and safely hand unmatched messages to a human—with no business content loaded from a hardcoded vertical JavaScript file.
