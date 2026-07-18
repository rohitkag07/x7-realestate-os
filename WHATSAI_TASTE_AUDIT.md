# WhatsAI Assistant Taste Audit

Date: 18 July 2026  
Scope: live dashboard and canonical `src/` frontend only  
Evidence: desktop `1440x900`, mobile `390x844`, source review, browser console

## Design Read

WhatsAI is an operational WhatsApp receptionist for non-technical Indian SMB owners. The interface should feel familiar, calm, trustworthy, and fast. It should borrow WhatsApp's interaction language without looking like a clone, and it should prioritize the next business action over decorative dashboard chrome.

Design dials:

- Visual variance: 4/10
- Motion intensity: 2/10
- Information density: 6/10
- Primary principle: familiar first, ownable second, decorative last

## How The Taste Skills Apply

### Primary: Redesign Existing Projects

Use its `scan -> diagnose -> fix` sequence. Preserve the existing Next.js stack, routes, Supabase contracts, media uploads, setup safeguards, and working responsive chat behavior.

### Supporting: Design Taste Frontend

Use its anti-generic rules for typography, hierarchy, spacing, surfaces, and icon consistency. Do not apply its high-variance landing-page defaults to an operational dashboard.

### Supporting Only: GPT Taste

Borrow the discipline around hierarchy and non-generic composition. Do not use its AIDA, hero-page, GSAP, or marketing-animation requirements inside the product dashboard.

### Later: Brandkit

Use after the operator experience is stable to replace the generic sparkle/`WA` identity with an ownable WhatsAI mark and a small reusable brand kit.

## Current Quality Score

| Dimension | Score | Finding |
|---|---:|---|
| Information architecture | 6/10 | Routes are clear, but desktop navigation is duplicated in Sidebar and TopBar. |
| Visual hierarchy | 6/10 | Pages are readable, but cards, pills, borders, and headings carry similar visual weight. |
| Product identity | 4/10 | WhatsApp green is coherent, but the sparkle icon, initials avatar, and generic SaaS cards are not ownable. |
| Chat experience | 7/10 | List-first mobile behavior and WhatsApp-style colors are strong; empty/selected states still feel unfinished. |
| Mobile usability | 6/10 | Navigation works and chats are usable; setup steps clip horizontally and dashboard becomes a long stack of equal cards. |
| States and feedback | 6/10 | Empty states exist, but several are oversized and low-action; loading/error patterns are not visually unified. |
| Accessibility | 6/10 | Labels and semantic colors are generally clear; small secondary text and icon-only actions need stronger targets and descriptions. |
| Overall taste | 6/10 | Functional and clean, but still resembles a Shadcn starter more than a focused WhatsAI product. |

## High-Priority Findings

### P0 - Duplicate desktop navigation

The same six destinations appear in both Sidebar and TopBar. This wastes horizontal space and splits the user's navigation model.

Fix: keep Sidebar as desktop navigation. Convert TopBar into context only: page title/breadcrumb, global search or attention count, service status, and account menu.

### P0 - Setup mobile stepper clips content

At `390px`, the horizontal step cards expose a cut-off second card. It communicates overflow but looks broken and makes the current step harder to understand.

Fix: replace mobile step cards with a compact `Step 1 of 4` header plus a tappable progress summary. Keep the vertical stepper only on desktop.

### P1 - Card and pill saturation

Most content is placed inside a rounded bordered card, then nested cards, pills, circular icons, and badges are added inside it. Repetition removes hierarchy.

Fix: reserve cards for grouped decisions. Use flat rows, dividers, tonal sections, and whitespace for activity lists and status summaries. Limit radii to three tokens.

### P1 - Dashboard is a status wall, not a morning brief

Four equal KPI cards place zero-value metrics at the same priority as two hot handoffs. The actionable item is visually diluted.

Fix: lead with a compact `Needs attention` strip containing handoffs and failed conversations. Move passive metrics into a lighter summary row. Prioritize the next appointment and recent customer action.

### P1 - Weak ownable identity

The green sparkle icon and `WA` avatar could belong to any AI SaaS. The current visual language depends heavily on WhatsApp green but does not establish WhatsAI's own signature.

Fix: create a simple receptionist/response-loop mark, a wordmark lockup, and a restrained deep-teal plus signal-green palette. Keep WhatsApp bubble colors only inside chat.

### P1 - Empty spaces feel unfinished

The unselected desktop chat and empty calendar side panel occupy large blank areas without a useful next action.

Fix: use contextual instructions and one action: select the newest unread chat, connect WhatsApp, or create an appointment. Avoid decorative empty-state illustrations.

## Route Review

### Dashboard

Keep: morning-summary concept, recent activity, appointments, real agent health.

Change:

- Replace four equal cards with one compact metric rail.
- Add a top `Needs attention` module for handoffs and service failures.
- Turn activity into a flatter inbox preview with stronger timestamps and action status.
- Remove the `Owner-friendly mode` card from the Sidebar; the whole product should already be owner-friendly.

### Chats

Keep: responsive list-first behavior, 72px thread rows, WhatsApp wallpaper, bubble direction colors, canonical data source.

Change:

- Make selected and unread states visually distinct without multiple competing badges.
- Replace `Conversation` with contact identity and status in the chat header.
- Make the initial desktop state useful by selecting the most recent unread thread or showing an explicit keyboard-friendly choice.
- Standardize statuses into three operator states: `AI handling`, `Needs you`, `Closed`.
- Keep lead details progressively disclosed; do not overload the center chat column.

### Calendar

Keep: no external calendar dependency, month/week control, selected-day panel.

Change:

- Reduce oversized empty calendar cells on desktop.
- On mobile, default to an agenda list with date chips rather than compressing a seven-column grid.
- Make appointment state and owner action more prominent than calendar chrome.

### Setup

Keep: industry packs, no-lost-data confirmation, placeholder validation, private media upload, local autosave.

Change:

- Replace the large dark-green intro block with a compact reassurance header.
- Use one focused task per step and a sticky mobile action bar.
- Translate technical Meta fields into guided copy, examples, and copy buttons.
- Show completion as a checklist, not multiple `Ready`/`Needs input` badges.

## Redesign System

### Color roles

- Ink: `#111B21`
- Deep teal: `#075E54`
- Action green: `#00A884`
- Chat outbound only: `#D9FDD3`
- Canvas: `#F4F6F5`
- Surface: `#FFFFFF`
- Border: `#D8DEE4`
- Attention: `#D97706`
- Danger: `#C2413B`

Use green for primary actions and active system state, not as a decorative fill everywhere.

### Typography

- Use one high-legibility family for product UI and one weight scale with clear roles.
- Page title: 28-32px, semibold
- Section title: 16-18px, semibold
- Body: 14-15px
- Metadata: minimum 12px on mobile
- Avoid excessive uppercase and letter spacing in operational labels.

### Shape and depth

- Radius tokens: 8px controls, 12px grouped content, 18px major panels
- One subtle shadow level only for floating sheets/dialogs
- Prefer borders or tonal separation over stacked shadows

### Motion

- 160-220ms ease-out for drawers, selected rows, and step transitions
- No GSAP, parallax, entrance choreography, or decorative looping animation
- Respect `prefers-reduced-motion`

## Execution Plan

### R1 - Foundation and shell

- Introduce named design tokens in `globals.css`.
- Remove duplicate TopBar navigation.
- Simplify Sidebar and remove the owner-mode promo card.
- Establish page header, panel, row, badge, empty, loading, and error primitives.

### R2 - Morning brief dashboard

- Build `Needs attention` as the dominant module.
- Compress metrics into a summary rail.
- Redesign activity and appointments as action-oriented rows.
- Keep real agent health but reduce it to a compact service strip.

### R3 - Chats refinement

- Preserve the current responsive state machine.
- Improve chat header, selection, unread state, operator statuses, and empty state.
- Polish the lead drawer without increasing center-column density.

### R4 - Calendar and setup

- Add a mobile agenda mode to Calendar.
- Rebuild Setup's mobile step navigation and sticky actions.
- Preserve all template, media, validation, and no-lost-data behavior.

### R5 - Product-wide QA

- Check all six primary routes at `390`, `768`, `1280`, and `1440` widths.
- Keyboard-test navigation, dialogs, step controls, chat selection, and action menus.
- Verify loading, empty, error, offline, and long-text states.
- Run type-check, production build, route smoke tests, then deploy preview before production.

## Redesign Boundary

The redesign must not change Supabase schema, API contracts, webhook behavior, agent processes, keyword matching, private media uploads, or setup data-loss safeguards. It is a frontend information architecture and visual-system upgrade first.
