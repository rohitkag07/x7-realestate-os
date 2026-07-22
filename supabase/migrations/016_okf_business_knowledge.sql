-- =====================================================================
-- WhatsAI Assistant - OKF-compatible business knowledge base
-- =====================================================================
-- Keeps owner-approved knowledge separate from transactional keyword
-- rules while making every entry portable as Markdown + YAML metadata.

ALTER TABLE public.assistant_knowledge_items
  ADD COLUMN IF NOT EXISTS question text,
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en-IN',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS okf_slug text,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.assistant_knowledge_items
  DROP CONSTRAINT IF EXISTS assistant_knowledge_items_type_check;

ALTER TABLE public.assistant_knowledge_items
  ADD CONSTRAINT assistant_knowledge_items_type_check
  CHECK (type IN ('faq', 'service', 'pricing', 'policy', 'location', 'offer', 'document', 'other'));

ALTER TABLE public.assistant_knowledge_items
  DROP CONSTRAINT IF EXISTS assistant_knowledge_items_status_check;

ALTER TABLE public.assistant_knowledge_items
  ADD CONSTRAINT assistant_knowledge_items_status_check
  CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE public.assistant_knowledge_items
  DROP CONSTRAINT IF EXISTS assistant_knowledge_items_source_type_check;

ALTER TABLE public.assistant_knowledge_items
  ADD CONSTRAINT assistant_knowledge_items_source_type_check
  CHECK (source_type IN ('manual', 'website', 'document', 'okf'));

ALTER TABLE public.assistant_knowledge_items
  DROP CONSTRAINT IF EXISTS assistant_knowledge_items_locale_check;

ALTER TABLE public.assistant_knowledge_items
  ADD CONSTRAINT assistant_knowledge_items_locale_check
  CHECK (locale IN ('en-IN', 'hi-IN', 'hinglish'));

UPDATE public.assistant_knowledge_items
SET
  status = CASE WHEN is_active THEN 'published' ELSE 'draft' END,
  published_at = CASE WHEN is_active THEN COALESCE(published_at, updated_at, now()) ELSE published_at END,
  last_reviewed_at = COALESCE(last_reviewed_at, updated_at, created_at, now()),
  okf_slug = COALESCE(
    NULLIF(okf_slug, ''),
    trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 8)
  )
WHERE okf_slug IS NULL OR status = 'draft';

ALTER TABLE public.assistant_knowledge_items
  ALTER COLUMN okf_slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS assistant_knowledge_items_business_slug_uidx
  ON public.assistant_knowledge_items (business_id, okf_slug);

CREATE INDEX IF NOT EXISTS assistant_knowledge_items_runtime_lookup_idx
  ON public.assistant_knowledge_items (business_id, playbook_id, status, is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS assistant_knowledge_items_keywords_gin_idx
  ON public.assistant_knowledge_items USING gin (keywords);

COMMENT ON TABLE public.assistant_knowledge_items IS
  'Owner-approved, tenant-scoped business knowledge. Fields map directly to OKF Markdown frontmatter.';

COMMENT ON COLUMN public.assistant_knowledge_items.okf_slug IS
  'Stable path-safe identifier used when importing or exporting OKF Markdown files.';

COMMENT ON COLUMN public.assistant_knowledge_items.content IS
  'Exact owner-approved answer. WhatsAI must not generate facts beyond this content.';
