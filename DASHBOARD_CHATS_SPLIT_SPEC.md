# Dashboard + Chats Split Spec

## Product outcome

Give an SMB owner two clear workspaces: a calm morning briefing at `/dashboard` and a focused WhatsApp operator inbox at `/chats`.

## Locked boundaries

- Reuse `loadWhatsAiInboxData`; do not change `src/lib/whatsai-data.ts`.
- Reuse existing reply, thread-state, handoff, and appointment APIs.
- Do not edit `src/app/api/**`, `agents/`, Supabase migrations, or backend runtime files.
- `/conversations` remains a compatibility redirect to `/chats`.

## Dashboard behavior

- `/dashboard` loads the current canonical inbox snapshot server-side.
- KPI cards are derived from today's messages, qualified threads, appointments in the current week, and open handoffs.
- Activity shows the five most recent threads with a human-readable status.
- Upcoming appointments shows the next three appointment-bearing threads.
- Agent status polls `/api/agent-mesh/health` client-side and gracefully shows unavailable agents as offline.
- Primary CTA links to `/chats`.

## Chats behavior

- `/chats` owns the existing inbox UI and preserves its query parameter selection behavior.
- Desktop uses thread list plus chat and a lead-info drawer/panel.
- Tablet hides the panel until Lead Info is selected.
- Mobile is list-first; a selected thread opens the chat and lead info opens a sheet.
- Existing `/api/whatsai/reply` and `/api/whatsai/thread-state` contracts remain unchanged.

## Navigation

Sidebar and top quick links expose exactly: Dashboard, Chats, Calendar, Leads, Setup, Settings.

## Acceptance criteria

- `/dashboard` returns 200.
- `/chats` returns 200.
- `/conversations` redirects to `/chats`.
- Existing backend and Supabase query files are unchanged.
- `npm run type-check` and `npm run build` pass.
