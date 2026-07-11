# Calendar and Booking Spec

## Outcome

Give a WhatsAI business owner one calm place to see AI-booked appointments and take the three operational actions that matter: confirm, reschedule, or cancel.

## Users and job

The primary user is a non-technical Indian SMB owner managing WhatsApp leads from a phone or laptop. The job is to answer: “Who is coming, when, and what do I need to do next?”

## Data contract

- Source table: `appointments`.
- Display fields: `id`, `contact_id`, `thread_id`, `title`, `appointment_type`, `scheduled_at`, `status`, `notes`.
- Contact display data is resolved from `conversation_contacts` by `contact_id`.
- Supported status transitions: `scheduled -> confirmed`, `scheduled|confirmed -> cancelled`, and `scheduled|confirmed -> scheduled` with a new `scheduled_at` for rescheduling.
- No schema or agent changes are required.

## Route and interaction

- `/calendar` loads upcoming and recent appointments from Supabase.
- Month view shows a compact date grid and appointment dots.
- Week view shows seven day columns with appointment cards.
- Selecting a date filters the appointment list below the grid.
- Selecting an appointment opens a detail dialog with contact, phone, time, type, notes, and actions.
- Reschedule uses a native date/time input and persists through `PATCH /api/appointments/:id`.
- Confirm and cancel persist through the same route and refresh the calendar.

## Responsive behavior

- Desktop: month/week grid plus selected-day appointment list.
- Mobile: horizontal day strip, selected-day list, and full-width detail dialog.
- Empty state explains how appointments appear from WhatsApp qualification.
- Error state gives a retry action and names the `appointments` table.

## Acceptance criteria

- `npm run type-check` passes.
- `npm run build` passes.
- `/calendar` returns 200 locally.
- Existing `/conversations` data source and backend behavior are unchanged.
- Appointment actions show success/error feedback and do not silently mutate local state.
