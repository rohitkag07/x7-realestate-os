-- WhatsAI Assistant: operator-facing CRM stages for canonical contacts/threads.
-- Legacy leads.lead_stage is kept intact for backwards-compatible flows.

ALTER TABLE public.conversation_contacts
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new';

ALTER TABLE public.conversation_contacts
  DROP CONSTRAINT IF EXISTS conversation_contacts_stage_check;

ALTER TABLE public.conversation_contacts
  ADD CONSTRAINT conversation_contacts_stage_check
  CHECK (stage IN ('new', 'interested', 'negotiating', 'booked', 'lost', 'cold'));

ALTER TABLE public.conversation_threads
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'new';

ALTER TABLE public.conversation_threads
  DROP CONSTRAINT IF EXISTS conversation_threads_stage_check;

ALTER TABLE public.conversation_threads
  ADD CONSTRAINT conversation_threads_stage_check
  CHECK (stage IN ('new', 'interested', 'negotiating', 'booked', 'lost', 'cold'));

-- Seed the new field from existing lifecycle information where it is unambiguous.
UPDATE public.conversation_contacts
SET stage = CASE lifecycle_stage
  WHEN 'qualified' THEN 'interested'
  WHEN 'appointment' THEN 'interested'
  WHEN 'customer' THEN 'booked'
  WHEN 'lost' THEN 'lost'
  ELSE stage
END
WHERE stage = 'new';

UPDATE public.conversation_threads
SET stage = CASE lead_stage
  WHEN 'qualified' THEN 'interested'
  WHEN 'visit_scheduled' THEN 'interested'
  WHEN 'visited' THEN 'interested'
  WHEN 'negotiation' THEN 'negotiating'
  WHEN 'booked' THEN 'booked'
  WHEN 'lost' THEN 'lost'
  ELSE stage
END
WHERE stage = 'new';

CREATE INDEX IF NOT EXISTS idx_conversation_contacts_business_stage
  ON public.conversation_contacts (business_id, stage);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_business_stage
  ON public.conversation_threads (business_id, stage);
