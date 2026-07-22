-- Align the production businesses table with the setup wizard contract.
-- This is additive and preserves all existing business IDs and data.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS builder_id uuid,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS owner_phone text,
  ADD COLUMN IF NOT EXISTS owner_whatsapp text,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  ADD COLUMN IF NOT EXISTS daily_message_limit integer NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS handoff_threshold integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_category_check;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_category_check
  CHECK (category IN ('real_estate', 'clinic', 'coaching', 'gym', 'local_service', 'other'));

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_daily_message_limit_check;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_daily_message_limit_check
  CHECK (daily_message_limit > 0);

CREATE INDEX IF NOT EXISTS businesses_builder_id_idx
  ON public.businesses (builder_id)
  WHERE builder_id IS NOT NULL;

UPDATE public.businesses
SET
  owner_phone = COALESCE(owner_phone, phone),
  owner_whatsapp = COALESCE(owner_whatsapp, phone),
  metadata = COALESCE(metadata, '{}'::jsonb);
