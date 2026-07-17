# Tier-2 Industry Templates Plan

## Decision

Build Smart Onboarding Starter Packs for five ad-driven Tier-2 SMB categories:

1. Clinics
2. Education and coaching
3. Real estate
4. Gyms and wellness
5. Local services

Each category loads 10 prebuilt deterministic rules when selected in Setup Step 1. A rule is not production-ready until the owner replaces its bracketed prompt with business-specific information. The Sales Agent, Summoner, Tool Gateway, canonical conversation writes, and `DYNAMIC_KEYWORD_ENGINE_ENABLED` stay unchanged.

## Goals

- Give a first-time owner a useful playbook in under 10 minutes.
- Prevent generic replies such as "share your budget" when the owner knows the exact price, address, or schedule.
- Keep every response deterministic and editable. No LLM, generated text, or new third-party dependency.
- Make media optional: brochure PDF, result image, tour video, or price card can be attached to the relevant rule after first save.

## Non-Goals

- Do not auto-publish incomplete placeholder rules.
- Do not replace `keyword_replies` with another database table.
- Do not send media until an owner intentionally attaches a tenant-scoped private asset.
- Do not alter WhatsApp webhook, Tool Gateway authentication, agent routing, or database migrations.

## Template Data Architecture

### New File

Create `src/lib/industry-templates.ts` as the single authoring source. Replace the small hand-written data in `src/lib/starter-keyword-rules.ts` with a compatibility re-export, so there is one authoritative pack source.

```ts
export type TemplateIndustry = 'clinic' | 'coaching' | 'real_estate' | 'gym' | 'local_service';

export type IndustryTemplateRule = KeywordReplyRule & {
  required_fields: string[];
  help_text: string;
  completion_state: 'needs_owner_input' | 'ready';
  suggested_media?: 'image' | 'video' | 'document';
};

export type IndustryTemplatePack = {
  category: TemplateIndustry;
  title: string;
  owner_checklist: string[];
  fallback_reply: string;
  rules: IndustryTemplateRule[];
};
```

`reply` must contain explicit placeholders such as `[Enter consultation fee]`. `required_fields` lets the UI calculate readiness without parsing copy. `intent` maps rules to the existing Hinglish synonym packs (`price`, `location`, `timing`, `booking`, `offers`). Existing `fuzzy_enabled: true` and `fuzzy_threshold: 0.82` remain the default.

### Template Catalog

Every pack ships with exactly 10 owner-fillable rules. The actual keywords are compact seed keywords; the existing synonym engine catches variants such as `fess`, `kitna lgega`, `loc`, and `kaha hai`.

#### 1. Clinic Pack

| Rule | Keywords | Intent | Owner reply placeholder | Media |
|---|---|---|---|---|
| Consultation fee | fees, consultation, charge | price | `Consultation is Rs [fee]. [Include what it covers].` | - |
| Clinic timing | timing, open, hours | timing | `We are open [days] from [start] to [end].` | - |
| Location | location, address, map | location | `Our clinic is at [address]. Maps: [link].` | image optional |
| Doctor profile | doctor, qualification, experience | - | `Dr [name] is [qualification] with [years] years of experience.` | image optional |
| Appointment | appointment, book, visit | booking | `Please share your preferred date and time. Available slots: [slots].` | - |
| Tooth pain / urgent | pain, toothache, urgent | - | `For urgent pain, please call [phone]. The earliest consultation slot is [slot].` | - |
| Root canal | root canal, rct, tooth treatment | - | `Root canal treatment starts at Rs [price], subject to consultation.` | - |
| Skin / laser | laser, skin, pigmentation | - | `[Treatment] starts at Rs [price]. Consultation is required before treatment.` | image optional |
| Hair / IVF | hair, transplant, ivf | - | `[Treatment] starts at Rs [price]. Please book a private consultation.` | document optional |
| Current offer | offer, discount, package | offers | `[Offer details], valid until [date]. Terms: [terms].` | image optional |

Clinic pack must keep the existing emergency handoff language as a protected high-priority rule. It is never marked complete by an owner.

#### 2. Education and Coaching Pack

| Rule | Keywords | Intent | Owner reply placeholder | Media |
|---|---|---|---|---|
| Course fee | fees, fee, price | price | `[Course] fee is Rs [fee]. Payment options: [options].` | document optional |
| Course and duration | course, duration, program | - | `[Course] runs for [duration] and covers [summary].` | document optional |
| Batch timing | batch, timing, schedule | timing | `Available batches: [batch times].` | - |
| Demo class | demo, trial class, sample | booking | `Next demo class: [date/time]. Reply YES to reserve a seat.` | - |
| Syllabus | syllabus, subjects, curriculum | - | `The syllabus covers [subjects].` | document optional |
| Results | results, rank, topper | - | `Recent results: [short proof].` | image optional |
| Placement | placement, job, package | - | `Placement support includes [details]. Recent outcomes: [details].` | image optional |
| Hostel | hostel, accommodation, stay | - | `Hostel options: [availability, price, distance].` | image optional |
| Location | location, address, map | location | `We are at [address]. Maps: [link].` | image optional |
| Scholarship / discount | discount, scholarship, offer | offers | `[Offer/scholarship criteria] ends on [date].` | image optional |

#### 3. Real Estate Pack

| Rule | Keywords | Intent | Owner reply placeholder | Media |
|---|---|---|---|---|
| Starting price | price, rate, budget | price | `[Project] starts at Rs [price].` | - |
| BHK / unit options | bhk, size, unit | - | `Available options: [unit list with sizes].` | image optional |
| Floor plan | floor plan, layout, plan | - | `Here is the [unit] floor plan.` | image |
| Brochure | brochure, pdf, details | - | `Sharing the latest project brochure.` | document |
| Location | location, landmark, map | location | `[Project] is near [landmark]. Maps: [link].` | image optional |
| Site visit | site visit, visit, dekhna | booking | `Site visits are available [days/times]. Share your preferred slot.` | - |
| Loan | loan, emi, finance | - | `Loan support is available through [banks]. Estimated EMI starts at Rs [amount].` | - |
| Possession | possession, handover, ready | - | `Expected possession: [month/year].` | - |
| Amenities | amenities, facilities, clubhouse | - | `Key amenities: [list].` | image optional |
| Offer | offer, discount, booking offer | offers | `[Current offer] valid until [date].` | image optional |

#### 4. Gym and Wellness Pack

| Rule | Keywords | Intent | Owner reply placeholder | Media |
|---|---|---|---|---|
| Monthly fee | fees, monthly, price | price | `1-month membership is Rs [price].` | - |
| Quarterly / yearly fee | quarterly, yearly, annual | price | `[Plan] membership is Rs [price].` | - |
| Personal trainer | trainer, pt, personal training | - | `Personal training costs Rs [price] and includes [details].` | - |
| Diet plan | diet, nutrition, meal plan | - | `Diet support includes [details] for Rs [price].` | - |
| Gym timing | timing, open, hours | timing | `Gym timings: [hours].` | - |
| Ladies batch | ladies, women, female batch | timing | `Ladies batch timing: [days/times].` | - |
| Location | location, address, map | location | `We are at [address]. Maps: [link].` | image optional |
| Free trial | trial, demo, visit | booking | `Your free trial can be booked for [slots].` | - |
| Packages | package, combo, offer | offers | `[Package] includes [benefits] for Rs [price].` | image optional |
| Gym tour | tour, equipment, ambience | - | `Here is a quick gym tour.` | video |

#### 5. Local Services Pack

| Rule | Keywords | Intent | Owner reply placeholder | Media |
|---|---|---|---|---|
| Base visiting charge | visiting charge, visit, fees | price | `Our inspection/visiting charge is Rs [price].` | - |
| Quotation | quotation, quote, estimate | price | `Please share [required details]. We will send a quotation within [time].` | - |
| Standard service rates | charges, service price, cost | price | `[Service] starts at Rs [price].` | document optional |
| Service area | location, area, pincode | location | `We serve [areas]. Share your pin code to confirm coverage.` | - |
| Turnaround time | kitna time, time, duration | timing | `Typical completion time is [duration].` | - |
| Working hours | timing, open, hours | timing | `Working hours: [days/times].` | - |
| Warranty | warranty, guarantee | - | `Warranty: [terms and duration].` | document optional |
| Urgent visit | urgent, today, emergency | booking | `For urgent service, call [phone]. Earliest visit: [slot].` | - |
| Schedule visit | booking, appointment, visit | booking | `Share your address and preferred slot: [slots].` | - |
| Current offer | offer, discount, deal | offers | `[Offer] valid until [date].` | image optional |

## Wizard UX Specification

### Step 1: Select an Industry

When `category` changes:

1. Show a confirmation only if the owner already edited rules: `Replace your current replies with the [industry] starter pack?`
2. If confirmed, load a deep clone from `getIndustryTemplatePack(category)`.
3. Set `fallback_reply` and `qualification_questions_text` from the same pack.
4. Mark `template_source` in local wizard state only. It is not a second persistence contract.

Do not overwrite rules merely because the page restores local storage or rerenders.

### Step 3: Fill in the Blanks

Update `KeywordReplyEditor.tsx` with an operator-friendly template state:

- A compact header: `Complete 7 of 10 replies` plus a progress bar.
- A visible `Needs your details` badge on rules with `completion_state: 'needs_owner_input'`.
- Highlight bracketed placeholder text inside the reply textarea helper, not as uneditable text.
- Show `What to enter` from `help_text`, e.g. `Add one exact monthly fee and whether GST is included.`
- Group optional media under a small `Recommended attachment` block. Reuse the existing private upload flow. Do not make media required for setup completion.
- Add `Reset this pack` and `Start blank` actions. Both require confirmation and operate only on local wizard state until the owner presses `Complete setup`.
- Preserve the Live Tester. It must label a reply as `Template incomplete` when a matching rule still contains a placeholder.

### Readiness Gate

The wizard permits a draft save, but the final activation CTA must show incomplete rules. Recommended copy:

`8 replies still need your business details. You can save now, but WhatsAI will not auto-reply using incomplete rules.`

Implementation choice: incomplete rules are persisted with `enabled: false`. When an owner fills all required fields, the editor sets `enabled: true` and `completion_state: 'ready'`. This avoids accidental placeholder messages while retaining draft work in the single `assistant_playbooks.keyword_replies` JSONB contract.

## Backend Compatibility

- No Sales Agent code change is required. It already reads `enabled`, `keywords`, `reply`, `intent`, fuzzy configuration, and media descriptors from `keyword_replies`.
- No new tables or migrations are required.
- The existing Hinglish synonym packs are global intent behavior. Template keywords stay concise; synonyms are not duplicated into each saved rule.
- Existing businesses keep their existing rules. Templates apply only when a new template is explicitly selected or reset.

## Execution Roadmap

### P1: Data Model and Pack Authoring

1. Create `src/lib/industry-templates.ts` with the five packs and 50 rules above.
2. Add `required_fields`, `help_text`, `completion_state`, and optional `suggested_media` to the frontend-only template type.
3. Update `src/types/database.ts` only if reusable optional rule metadata needs persistence; otherwise strip the UI-only fields before the setup API request.
4. Refactor `src/lib/starter-keyword-rules.ts` to call the new pack factory and retain `getStarterKeywordRules()` compatibility.

### P2: Setup Wizard State Safety

1. Update `WhatsAiSetupForm.tsx` to track whether a user changed a rule.
2. Load category packs only on explicit initial selection or confirmed replacement.
3. Save template metadata in browser state, but submit only canonical `keyword_replies` and `fallback_reply`.
4. Add draft versus activation validation so unfinished rules are disabled.

### P3: Editor Polish

1. Extend `KeywordReplyEditor.tsx` props with optional template metadata.
2. Render readiness count, owner-help copy, incomplete badges, reset action, and media recommendation.
3. Keep existing attachments, upload authorization, fuzzy toggle, keyword chips, and Live Tester intact.
4. Add keyboard and mobile checks for all actions.

### P4: Tests and Release Proof

1. Add unit tests for template cloning: category change does not share array references.
2. Add tests that incomplete templates are disabled and completed templates enable correctly.
3. Test all five packs contain exactly 10 unique rule IDs and a fallback.
4. Run `npm run type-check`, `npm run build`, and Sales Agent keyword tests.
5. Manual smoke: select Gym, verify 10 prompts, complete monthly fee, attach a MP4 after initial save, and run `fees kya hai` through the Live Tester.

## Acceptance Criteria

- Selecting each of the five categories loads exactly 10 category-relevant rules.
- No completed or existing business rules are overwritten without confirmation.
- Every preloaded rule clearly identifies the business data the owner must provide.
- Incomplete placeholder replies cannot be sent as automatic WhatsApp responses.
- Media recommendations reuse private `whatsai-media` uploads and do not weaken RLS.
- The existing deterministic Hinglish matcher, canonical message persistence, and Tool Gateway media delivery continue without regression.
