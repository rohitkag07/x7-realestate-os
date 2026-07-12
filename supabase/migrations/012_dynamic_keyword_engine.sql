BEGIN;

ALTER TABLE public.assistant_playbooks
  ADD COLUMN IF NOT EXISTS keyword_replies jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fallback_reply text NOT NULL DEFAULT 'Thanks for your message. Our team will reply shortly.',
  ADD COLUMN IF NOT EXISTS playbook_version integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'assistant_playbooks_keyword_replies_array'
      AND conrelid = 'public.assistant_playbooks'::regclass
  ) THEN
    ALTER TABLE public.assistant_playbooks
      ADD CONSTRAINT assistant_playbooks_keyword_replies_array
      CHECK (jsonb_typeof(keyword_replies) = 'array');
  END IF;
END $$;

-- Keep the newest active playbook before enforcing one active row per tenant.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY business_id
           ORDER BY updated_at DESC, created_at DESC, id DESC
         ) AS active_rank
  FROM public.assistant_playbooks
  WHERE is_active = true
)
UPDATE public.assistant_playbooks AS playbook
SET is_active = false,
    updated_at = now()
FROM ranked
WHERE playbook.id = ranked.id
  AND ranked.active_rank > 1;

CREATE INDEX IF NOT EXISTS assistant_playbooks_business_active_lookup
  ON public.assistant_playbooks (business_id, updated_at DESC)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS assistant_playbooks_one_active_per_business
  ON public.assistant_playbooks (business_id)
  WHERE is_active = true;

COMMIT;
