# WhatsAI Assistant: Tier-2 Hinglish and Media Upgrade Plan

**Status:** Backlog-ready specification  
**Prepared:** 13 July 2026  
**Product constraint:** Zero LLM. Every reply remains deterministic, tenant-scoped, explainable, and approved by the business.  
**Target cohort:** Clinics, coaching centres, gyms, salons/spas, local services, and real-estate businesses in Indore, Bhopal, Jaipur, and similar Tier-2 markets.

## Executive Decision

Build a two-stage deterministic intent matcher, not a general fuzzy chatbot:

1. **Curated intent aliases first:** shared Hinglish aliases plus industry-specific synonym packs.
2. **Conservative typo recovery second:** token-level bounded Damerau-Levenshtein distance, only for tokens of four or more characters, with a unique-winner margin and explicit ambiguity rejection.

Do not use Double Metaphone. It is designed around English phonetics and will not reliably normalize Roman Hindi. Do not make Fuse.js the runtime decision-maker. Fuse uses a modified Bitap score affected by threshold, location, distance, and field length; that is useful for search UI, but too implicit for a system that sends business-approved replies automatically. [Fuse.js scoring documentation](https://www.fusejs.io/fuzzy-search.html)

For media, keep `keyword_replies` as the rule source, but attach a validated media descriptor to each rule. Store files in a tenant-scoped private Supabase Storage bucket. Generate a short-lived signed URL at send time, then send image, video, or document through Tool Gateway. Do not store expiring signed URLs as the canonical asset identity.

## 1. Verified Current State

The current implementation is a strong base but has two specific gaps:

| Surface | Current behaviour | Gap |
|---|---|---|
| `agents/x7-re-sales-agent/keyword-engine.js` | NFKC normalization, punctuation folding, exact/word/contains matching | No typo recovery, aliases, match score, ambiguity rejection, or intent packs |
| `src/lib/keyword-reply-schema.ts` | Validates 30 rules with keyword arrays and exact replies | No fuzzy policy or media descriptor |
| `src/components/whatsai/KeywordReplyEditor.tsx` | Keyword chips, match type, exact reply, browser tester | No synonym suggestions, score/reason display, upload, preview, replace, or delete |
| `assistant_playbooks.keyword_replies` | JSONB array is the tenant reply source | Media fields and per-rule fuzzy policy are absent |
| `agents/x7-re-tool-gateway/index.js` | Supports text, image, and document URL sends | No video send route; media validation and structured failure codes are weak |
| Sales Agent | Sends matched text through Tool Gateway and records metadata | Does not choose media sends or record media decision metadata |

## 2. Market Research: Tier-2 WhatsApp Behaviour

### 2.1 What the evidence supports

- IAMAI/Kantar's Internet in India 2024 report says 870 million users accessed Indic-language internet content in 2024, and 57% of urban users preferred Indic-language content. It also reports that one in five internet users uses voice commands. This supports vernacular and short conversational inputs as a first-class product requirement. [IAMAI/Kantar Internet in India 2024](https://www.iamai.in/sites/default/files/research/Kantar_%20IAMAI%20report_2024_.pdf)
- Meta and Bain report more than 650 million Indians on messaging/social platforms and describe future journeys as more multimodal, vernacular, and conversation-centric. [Win With Conversations 2024](https://about.fb.com/wp-content/uploads/2024/05/Win-With-Conversations-Report_2024.pdf)
- The `hinglishNorm` research corpus was motivated by a WhatsApp conversational system serving Tier-2 and Tier-3 Indian users. It describes real inputs as Hindi-English code mix with typos, non-standard spelling, phonetic substitutions, abbreviations, and colloquialisms. Its 13,494 annotated segments required normalization in 80.08% of cases. [hinglishNorm paper](https://arxiv.org/abs/2010.08974)
- Meta reports that 91% of online adults in India chat with a business weekly, which supports WhatsApp as an operating channel rather than an optional widget. [Meta India business messaging update](https://about.fb.com/news/2025/09/bringing-new-tools-to-help-businesses-boost-engagement-customer-support-and-discoverability/)

### 2.2 Product psychology for the pilot

These are design implications, not claims that every Tier-2 user behaves identically:

1. **Intent comes before grammar.** Users often send one noun or a short phrase: `fees`, `loc`, `kal slot`, `offer h`.
2. **Price and trust are early filters.** Users want price range, location proof, timings, and availability before sharing detailed personal information.
3. **Roman Hindi has no single spelling.** `kaha`, `kahan`, `kha`, and `kidhar` can express the same location intent.
4. **Media reduces explanation cost.** A brochure, rate card, clinic profile, gym tour, map, or offer creative answers several trust questions at once.
5. **Users expect asynchronous continuity.** They may send fragments across multiple messages rather than one complete sentence.
6. **Wrong confident replies are worse than handoff.** Fuzzy matching must optimize precision first. A fallback is acceptable; a wrong clinic price or property promise is not.

### 2.3 Core intent lexicon

The five categories below are the MVP priorities across the current verticals. The ordering is a product hypothesis derived from common SMB conversion flows, not a nationally measured ranking. Validate it against at least 500 anonymized production inbound messages before treating it as permanent.

#### Intent 1: Price / Fees

1. `price`
2. `prices`
3. `rate`
4. `rates`
5. `cost`
6. `fees`
7. `fee`
8. `fess`
9. `fis`
10. `pice`
11. `prize`
12. `kitna`
13. `kitne ka`
14. `kitna lagega`
15. `kya rate hai`
16. `charges`
17. `kharcha`
18. `budget kya hai`
19. `monthly kitna`
20. `total kitna`

#### Intent 2: Location / Directions

1. `location`
2. `loc`
3. `address`
4. `adress`
5. `addres`
6. `kaha hai`
7. `kahan hai`
8. `kidhar hai`
9. `kha h`
10. `kaha pe`
11. `map`
12. `map bhejo`
13. `pin`
14. `location bhejo`
15. `kaise aau`
16. `rasta`
17. `route`
18. `nearest landmark`
19. `paas me kya hai`
20. `distance kitna`

#### Intent 3: Timings / Availability

1. `timing`
2. `timings`
3. `time`
4. `tym`
5. `kab khula hai`
6. `kab open`
7. `open kab`
8. `kitne baje`
9. `kb open h`
10. `closing time`
11. `close kab`
12. `today open`
13. `aaj khula hai`
14. `sunday open`
15. `working hours`
16. `office time`
17. `clinic time`
18. `batch timing`
19. `slot kab hai`
20. `availability`

#### Intent 4: Booking / Appointment / Visit

1. `book`
2. `booking`
3. `appointment`
4. `apointment`
5. `appointmnt`
6. `slot`
7. `book karna hai`
8. `appointment chahiye`
9. `time fix karo`
10. `visit book`
11. `demo book`
12. `trial book`
13. `site visit`
14. `kal ka slot`
15. `aaj ka slot`
16. `confirm karo`
17. `reserve`
18. `registration`
19. `naam likh do`
20. `callback chahiye`

#### Intent 5: Offers / Discounts

1. `offer`
2. `offers`
3. `offar`
4. `ofr`
5. `discount`
6. `discout`
7. `dicount`
8. `deal`
9. `deals`
10. `scheme`
11. `sale`
12. `promotion`
13. `promo`
14. `coupon`
15. `cashback`
16. `kuch offer hai`
17. `best price`
18. `final price`
19. `discount kitna`
20. `festival offer`

### 2.4 Lexicon governance

- Store shared aliases in source-controlled, versioned packs. Do not silently inject new words into a tenant's saved rule.
- Show suggested aliases in the setup editor; the owner must approve them before activation.
- Capture unmatched normalized text and eventual operator-selected intent as training feedback, without storing unnecessary PII.
- Promote an alias into a shared pack only after at least five confirmed occurrences across two businesses, or explicit domain review.
- Maintain `dangerous_ambiguities`, for example `prize` may mean a competition prize rather than property price. Ambiguous terms should need another supporting token or fall back.

## 3. Technical Design: Smart Deterministic Matcher

### 3.1 Algorithm choice

| Option | Decision | Reason |
|---|---|---|
| Fuse.js / Bitap | Do not use for automatic reply decisions | Good search UX, but threshold/location/field-length scoring is harder to explain and tune for a high-precision send action |
| Plain Levenshtein | Use only as a baseline | Does not treat adjacent transposition such as `fess`/`fees` as one edit |
| Damerau-Levenshtein | **Use** | Handles insertion, deletion, substitution, and adjacent transposition; small implementation and deterministic score |
| Double Metaphone | Reject | English-oriented phonetic encoding; Roman Hindi spelling does not have stable English phonetics |
| Massive hardcoded dictionary | Use in bounded form | High precision for common Hinglish phrases, but must be versioned, reviewed, and measured rather than growing without governance |

### 3.2 Matching pipeline

Run in this exact order:

1. **Safety rules:** current clinic/emergency and mandatory handoff checks remain first.
2. **Normalization:** NFKC, lowercase, punctuation fold, repeated-character cap (`feeees` → `fees` only after three repeats), whitespace collapse.
3. **Phrase aliases:** exact canonical phrase map such as `kaha hai` → `location`.
4. **Current deterministic rules:** exact, whole-word, and contains matching.
5. **Token-level typo recovery:** compare message tokens/windows against approved keywords and approved aliases.
6. **Ambiguity gate:** auto-reply only if one winner clears the threshold and beats runner-up by the required margin.
7. **Fallback/handoff:** preserve current behaviour when confidence is insufficient.

### 3.3 Conservative fuzzy thresholds

```text
token length 1-3: fuzzy disabled; aliases only
token length 4-5: max Damerau distance 1 and similarity >= 0.80
token length 6-8: max distance 2 and similarity >= 0.78
token length 9+:  max distance 2 and similarity >= 0.82
phrase: compare equal-size token windows; every meaningful token must pass
winner margin: best similarity must exceed runner-up by >= 0.12
```

Similarity:

```text
similarity(a, b) = 1 - damerauLevenshtein(a, b) / max(length(a), length(b))
```

Never fuzzy-match:

- phone numbers, prices, dates, times, IDs, names, or one-to-three-character tokens;
- medical safety terms after the safety layer has made a decision;
- generic stop words: `hai`, `h`, `ka`, `ke`, `me`, `to`, `the`, `is`;
- keywords marked `fuzzy_enabled: false` by the operator;
- a result with two intents inside the winner margin.

### 3.4 Industry synonym packs

Create a shared base pack plus vertical packs:

```ts
type IntentAliasPack = {
  version: number;
  locale: 'en-IN' | 'hi-Latn' | 'hi-Deva';
  intents: Record<string, {
    phrases: string[];
    typoAliases: string[];
    blockedAmbiguities?: string[];
  }>;
};
```

Suggested files:

- `src/lib/intent-packs/core-commerce.ts`
- `src/lib/intent-packs/real-estate.ts`
- `src/lib/intent-packs/clinic.ts`
- `src/lib/intent-packs/coaching.ts`
- `src/lib/intent-packs/gym.ts`
- `src/lib/intent-packs/salon-spa.ts`
- `agents/x7-re-sales-agent/intent-packs.js` generated from one neutral JSON source during build

Do not maintain separate handwritten frontend/backend alias lists. Use a shared JSON artifact or a generation script, and add a parity test.

### 3.5 Rule contract extension

```json
{
  "id": "fees",
  "label": "Fees",
  "keywords": ["fees", "fee", "monthly fee"],
  "intent": "price",
  "match_type": "word",
  "fuzzy_enabled": true,
  "fuzzy_threshold": 0.8,
  "reply": "Our monthly fee is Rs 1,500.",
  "priority": 100,
  "enabled": true,
  "handoff": false,
  "media": null
}
```

Runtime result must expose:

```json
{
  "rule_id": "fees",
  "intent": "price",
  "match_mode": "alias|exact|word|contains|fuzzy",
  "matched_keyword": "fees",
  "observed_token": "fess",
  "similarity": 0.75,
  "alias_pack_version": 1,
  "runner_up_similarity": 0.25
}
```

Do not log the full customer message in matcher metrics. Canonical conversation storage already owns the message body.

### 3.6 Accuracy gates

Build a labelled fixture of at least 500 phrases:

- 100 per core intent;
- at least 40% Hinglish;
- at least 20% deliberate spelling errors;
- at least 100 negative/ambiguous messages;
- separate Clinic safety set.

Required before rollout:

- precision >= 98% for automatic replies;
- recall >= 90% across the five core intents;
- wrong-intent rate < 1%;
- safety false-negative rate = 0 on the approved Clinic fixture;
- ambiguous cases fall back rather than auto-send;
- p95 matcher time < 20 ms for 30 rules and 600 aliases on one CPU core.

## 4. Technical Design: Media Support

### 4.1 Media rule contract

The user's requested `media_url` and `media_type` are supported, but `storage_path` is canonical because signed URLs expire.

```json
{
  "media_type": "image|video|document",
  "media_url": null,
  "storage_bucket": "whatsai-playbook-media",
  "storage_path": "business-id/playbook-id/rule-id/uuid-file.pdf",
  "mime_type": "application/pdf",
  "file_name": "clinic-pricing.pdf",
  "size_bytes": 482301,
  "sha256": "hex-digest",
  "caption": "Here is our current pricing guide."
}
```

Rules:

- `media_type` is optional; when absent, send text exactly as today.
- `media_url` may hold an intentionally public immutable asset URL, but must never hold a short-lived signed URL in persisted JSON.
- If `storage_path` exists, the server generates a signed URL immediately before Tool Gateway send.
- A rule may have one media attachment in MVP. Multi-asset/carousel is a separate phase.
- The exact reply becomes the media caption where supported. Do not send duplicate text plus caption on success.

### 4.2 Supabase Storage design

Create migration `014_whatsai_playbook_media.sql`:

1. Create private bucket `whatsai-playbook-media`.
2. Restrict MIME types to:
   - image: `image/jpeg`, `image/png`, `image/webp` only if Meta currently supports it;
   - video: `video/mp4`, `video/3gpp`;
   - document MVP: `application/pdf`.
3. Use tenant paths: `{business_id}/{playbook_id}/{rule_id}/{uuid}-{safe_file_name}`.
4. Add Storage RLS policies for authenticated operators who belong to that business.
5. Add delete policy and cleanup workflow for replaced/orphaned files.
6. Add `playbook_media_assets` metadata table rather than relying only on embedded JSON:

```sql
id uuid primary key,
business_id uuid not null,
playbook_id uuid not null,
rule_id text not null,
bucket text not null,
object_path text not null,
media_type text check (...),
mime_type text not null,
file_name text not null,
size_bytes bigint not null,
sha256 text not null,
status text check ('uploading','ready','failed','deleted'),
created_by uuid,
created_at timestamptz,
updated_at timestamptz,
unique (playbook_id, rule_id)
```

The JSON descriptor makes the send decision self-contained; the asset table provides lifecycle, cleanup, audit, and tenant ownership.

Supabase recommends standard upload for files up to 6 MB and resumable TUS upload for larger files. Bucket-level MIME and size limits should be configured. [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads) [Supabase bucket access model](https://supabase.com/docs/guides/storage/buckets/fundamentals)

### 4.3 Product upload limits

Do not simply mirror the maximum provider limits. Use smaller pilot limits for reliability on mobile networks:

| Type | Pilot limit | Accepted format | UI behaviour |
|---|---:|---|---|
| Image | 5 MB | JPEG, PNG | standard upload, thumbnail preview |
| Video | 16 MB | MP4/H.264 + AAC | resumable upload above 6 MB, poster preview |
| Document | 10 MB initially | PDF | standard or resumable above 6 MB, filename/size preview |

Meta's official WhatsApp Business Platform collection supports URL- or ID-based image, video, and document messages through `/{phone-number-id}/messages`, and tracks each message by provider ID through webhooks. [Meta official WhatsApp Postman collection](https://www.postman.com/meta/whatsapp-business-platform/folder/o48mro7/messages)

Reconfirm provider MIME and size limits from Meta documentation during implementation. Provider limits change; the app must keep its own stricter config and return a human-readable validation error before upload.

### 4.4 Upload API

Create `src/app/api/whatsai/playbook-media/route.ts`:

- `POST multipart/form-data`: validates authenticated operator, `business_id`, `playbook_id`, `rule_id`, file signature, MIME, size, and tenant ownership; uploads; inserts metadata; returns the canonical media descriptor.
- `DELETE`: validates tenant ownership, deletes object, marks asset deleted, and clears the rule attachment transactionally.
- Never accept a client-provided arbitrary final storage path.
- Never expose service-role credentials to the browser.
- File extension is not trusted; verify MIME and magic bytes server-side.
- Generate random immutable object names. Do not use `upsert`, which can cause stale CDN content.

**Blocking security dependency:** the upload API requires a trustworthy authenticated operator-to-business membership check. If the dashboard is still operating only through default tenant IDs, add `business_memberships`/role enforcement before enabling uploads for multiple customers.

### 4.5 Editor UX

Extend each `KeywordReplyEditor` rule card with:

- `Attach image, video, or PDF` button;
- drag/drop and file picker;
- upload progress, cancel, retry, replace, and remove;
- local validation before upload;
- preview card with thumbnail/poster/PDF icon, file name, type, and size;
- warning that a media reply replaces a standalone text reply and uses the exact reply as caption;
- Live Tester showing the match reason, score, and media preview;
- synonym suggestions with `Add all` and individual approval, never silent insertion;
- ambiguity warning when a keyword overlaps another active rule.

Mobile rules:

- upload action remains reachable with one thumb;
- progress survives accidental step navigation through wizard autosave metadata;
- do not store a raw `File` object in localStorage;
- incomplete uploads cannot be submitted as an active playbook.

### 4.6 Sales Agent and Tool Gateway send flow

```text
matched rule
  -> validate media descriptor belongs to business/playbook/rule
  -> create 10-minute signed URL OR use approved immutable public URL
  -> call Tool Gateway endpoint by media_type
  -> Meta returns wa_message_id
  -> write one canonical outbound conversation message
     with message_type, media_url/storage_path, rule_id, match metadata
```

Tool Gateway changes:

- keep `/whatsapp/send/image`;
- keep `/whatsapp/send/document`;
- add `/whatsapp/send/video`;
- validate HTTPS URL, type, caption length, filename, and business context;
- return structured codes: `media_unreachable`, `unsupported_mime`, `provider_rejected`, `provider_timeout`;
- use idempotency key `{thread_id}:{provider_inbound_id}:{rule_id}` to prevent duplicate sends;
- never fetch arbitrary internal/private-network URLs; allow only the configured Supabase Storage host or approved CDN hosts.

Failure policy:

1. If media validation fails before provider call, send the exact text reply once and create an operator alert.
2. If provider response proves no media message was accepted, send text fallback once.
3. If provider outcome is unknown after timeout, do not immediately send text; mark `delivery_unknown` and reconcile by webhook/provider status to avoid duplicates.
4. Record media failure separately from keyword-match success.

## 5. Prioritized Execution Plan

### M1: Build the evaluation corpus first

- [ ] Create `agents/x7-re-sales-agent/fixtures/tier2-intents.json` with 500 labelled positive/negative examples.
- [ ] Include all 100 phrases in this document plus vertical-specific and adversarial examples.
- [ ] Create `scripts/evaluate-hinglish-matcher.js` reporting precision, recall, confusion matrix, wrong-intent rate, fallback rate, and p95 latency.
- [ ] Save baseline results from the current exact matcher before changing it.

**Exit gate:** fixture reviewed, baseline reproducible, no customer PII.

### M2: Add one canonical alias-pack source

- [ ] Create `shared/intent-packs/*.json` for core and vertical aliases.
- [ ] Add version and blocked ambiguities.
- [ ] Create `scripts/build-intent-packs.js` to produce frontend/backend imports from the same JSON.
- [ ] Add parity test proving browser and agent use identical pack versions.

**Exit gate:** no duplicated handwritten alias list between `src/` and `agents/`.

### M3: Implement conservative fuzzy matching

- [ ] Modify `agents/x7-re-sales-agent/keyword-engine.js` with repeated-character normalization, token windows, bounded Damerau-Levenshtein, thresholds, and winner margin.
- [ ] Mirror deterministic preview logic in `src/lib/keyword-reply-schema.ts`, preferably through shared generated code.
- [ ] Extend `KeywordReplyRule` in `src/types/database.ts` with `intent`, `fuzzy_enabled`, and optional `fuzzy_threshold`.
- [ ] Extend Zod validation and reject unsafe threshold values.
- [ ] Persist match mode, similarity, runner-up score, and alias-pack version in outbound metadata.
- [ ] Keep safety checks and manual takeover ahead of fuzzy logic.

**Exit gate:** precision >= 98%, wrong intent < 1%, Clinic safety false negatives = 0, p95 < 20 ms.

### M4: Add synonym-assist UX

- [ ] Modify `src/components/whatsai/KeywordReplyEditor.tsx` to suggest aliases by selected intent/vertical.
- [ ] Show match mode and confidence in Live Tester.
- [ ] Show collision/ambiguity warnings before save.
- [ ] Update starter rules in `src/lib/starter-keyword-rules.ts` with intent IDs, not hundreds of runtime keyword duplicates.
- [ ] Update `src/app/api/whatsai/setup/route.ts` to validate the extended rule contract.

**Exit gate:** owner can approve suggestions and test `fess`, `kha h`, and `apointment` without understanding fuzzy-search settings.

### M5: Add tenant-safe media storage

- [ ] Create `supabase/migrations/014_whatsai_playbook_media.sql` for bucket, metadata table, indexes, RLS, and cleanup state.
- [ ] Confirm authenticated operator-to-business membership exists; add it before upload if missing.
- [ ] Add `src/lib/playbook-media-schema.ts` with MIME, size, descriptor, and URL-host validation.
- [ ] Create `src/app/api/whatsai/playbook-media/route.ts` for upload/delete.
- [ ] Add orphan cleanup script/cron for failed or replaced assets.

**Exit gate:** cross-tenant upload/read/delete tests pass; service-role key never reaches browser.

### M6: Add media editor controls

- [ ] Extend `KeywordReplyEditor.tsx` with upload, progress, preview, retry, replace, and remove.
- [ ] Extend `KeywordReplyRule` and Zod schema with optional media descriptor.
- [ ] Update wizard autosave to persist descriptor only, never `File` blobs or signed URLs.
- [ ] Add loading, error, cancellation, and mobile states.

**Exit gate:** one image, one MP4, and one PDF can be attached, previewed, removed, and saved from desktop and mobile.

### M7: Complete media sending

- [ ] Add `/whatsapp/send/video` to `agents/x7-re-tool-gateway/index.js`.
- [ ] Harden image/document routes with schema validation, host allowlist, timeouts, and structured errors.
- [ ] Modify `agents/x7-re-sales-agent/index.js` to resolve media and choose the correct Tool Gateway endpoint.
- [ ] Extend canonical outbound writes with media type, object identity, provider ID, and delivery status.
- [ ] Add idempotency protection and unknown-outcome reconciliation.

**Exit gate:** real Meta test number receives image, video, and PDF; dashboard shows each once with provider status.

### M8: Release proof and rollout

- [ ] Add `scripts/prove-tier2-media.js`.
- [ ] Assert all 100 core aliases map correctly.
- [ ] Assert adversarial phrases fall back rather than choose the wrong intent.
- [ ] Assert two businesses can attach different media to the same `fees` intent without leakage.
- [ ] Assert manual takeover suppresses both text and media.
- [ ] Assert duplicate webhook produces at most one provider send.
- [ ] Add `npm run prove:tier2-media`.
- [ ] Roll out to one internal business, then one Clinic and one non-medical SMB for 72 hours.

**Exit gate:** zero cross-tenant media access, zero duplicate sends, zero safety misses, and observed fallback rate reduced by at least 30% from baseline without violating precision gate.

## 6. Exact File Order

1. `agents/x7-re-sales-agent/fixtures/tier2-intents.json`
2. `scripts/evaluate-hinglish-matcher.js`
3. `shared/intent-packs/*.json`
4. `scripts/build-intent-packs.js`
5. `agents/x7-re-sales-agent/keyword-engine.js`
6. `agents/x7-re-sales-agent/keyword-engine.test.js`
7. `src/lib/keyword-reply-schema.ts`
8. `src/types/database.ts`
9. `src/components/whatsai/KeywordReplyEditor.tsx`
10. `src/lib/starter-keyword-rules.ts`
11. `src/app/api/whatsai/setup/route.ts`
12. `supabase/migrations/014_whatsai_playbook_media.sql`
13. `src/lib/playbook-media-schema.ts`
14. `src/app/api/whatsai/playbook-media/route.ts`
15. `agents/x7-re-tool-gateway/index.js`
16. `agents/x7-re-sales-agent/index.js`
17. `scripts/prove-tier2-media.js`
18. `package.json`, `.env.example`, `README.md`, `WHATSAI_RUNBOOK.md`

## 7. Failure Modes and Rollback

| Failure | Required behaviour |
|---|---|
| Fuzzy winner is ambiguous | No auto-reply; tenant fallback and handoff |
| Alias collides with two active rules | Block playbook save until owner resolves it |
| Matcher pack versions differ | Fail build/proof; do not deploy |
| Clinic safety phrase resembles commercial intent | Safety handoff always wins |
| Upload MIME/size invalid | Reject before storage; preserve previous attachment |
| Upload succeeds but playbook save fails | Mark asset orphaned and clean it asynchronously |
| Signed URL generation fails | Text reply plus operator alert; no media send |
| Meta rejects media | Send text only after confirmed rejection; record failure |
| Meta timeout has unknown outcome | Do not retry immediately; reconcile status first |
| Duplicate webhook | Idempotency key prevents a second send |
| Tenant requests another tenant's asset | `403`, security log, no signed URL |
| Rule attachment is removed | New messages stop using it immediately; object enters cleanup queue |

Rollback flags:

```env
HINGLISH_FUZZY_MATCHING_ENABLED=false
KEYWORD_MEDIA_SEND_ENABLED=false
```

Disabling fuzzy matching returns to current exact/word/contains behaviour. Disabling media sends returns to exact text replies while preserving uploaded assets and rule metadata.

## 8. Definition of Done

The upgrade is complete when:

1. `fess kya hai`, `kha h`, `kb open h`, `apointment chahiye`, and `kuch ofr hai` map to the correct approved intent without an LLM.
2. Ambiguous or unrelated phrases fall back instead of producing a plausible but wrong reply.
3. A business owner can attach and test one image, MP4, or PDF from the rule editor.
4. The real WhatsApp test number receives the correct tenant's media exactly once through Tool Gateway.
5. Canonical conversation history stores the match reason, rule/playbook version, media identity, provider message ID, and delivery state.
6. Another tenant cannot view, sign, replace, delete, or send that media.
7. `npm run type-check`, `npm run build`, matcher tests, storage/API tests, Tool Gateway tests, and `npm run prove:tier2-media` pass.
8. The controlled cohort meets the 98% precision gate and reduces fallback rate by at least 30% without safety regressions.

## Sources

- [IAMAI/Kantar, Internet in India 2024](https://www.iamai.in/sites/default/files/research/Kantar_%20IAMAI%20report_2024_.pdf)
- [Meta and Bain, Win With Conversations 2024](https://about.fb.com/wp-content/uploads/2024/05/Win-With-Conversations-Report_2024.pdf)
- [hinglishNorm corpus and normalization study](https://arxiv.org/abs/2010.08974)
- [Normalization of Spelling Variations in Code-Mixed Data](https://aclanthology.org/2022.icon-main.33.pdf)
- [Fuse.js fuzzy-search scoring](https://www.fusejs.io/fuzzy-search.html)
- [Meta official WhatsApp Business Platform Postman collection](https://www.postman.com/meta/whatsapp-business-platform/overview)
- [Meta official Messages collection](https://www.postman.com/meta/whatsapp-business-platform/folder/o48mro7/messages)
- [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Supabase Storage bucket access and restrictions](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
