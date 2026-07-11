-- =====================================================================
-- X7 WhatsAI Assistant - Option B canonical conversation compatibility
-- =====================================================================
-- The live DB had an earlier WhatsAI MVP schema:
--   business_channels(provider, channel_id)
--   conversation_messages(content, provider_msg_id, role)
--   conversation_threads(status active/bot_paused/human_takeover/closed)
--
-- Option B standardizes the application code on:
--   business_channels -> conversation_contacts -> conversation_threads -> conversation_messages
-- with business_channel_id + contact_id as the canonical thread key.
-- This migration is additive/backward-compatible and does not remove old data.
-- =====================================================================

-- Business channel compatibility names.
ALTER TABLE public.business_channels
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS channel_id text,
  ADD COLUMN IF NOT EXISTS channel_phone text,
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS channel_type text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS phone_number_id text,
  ADD COLUMN IF NOT EXISTS business_account_id text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS verify_token text,
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'testing',
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.business_channels
SET
  channel_type = COALESCE(channel_type, CASE WHEN provider = 'meta_whatsapp' THEN 'whatsapp' ELSE provider END),
  phone_number_id = COALESCE(phone_number_id, channel_id),
  phone_number = COALESCE(phone_number, channel_phone),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('legacy_provider', provider, 'legacy_config', config)
WHERE channel_type IS NULL OR phone_number_id IS NULL OR phone_number IS NULL;

CREATE INDEX IF NOT EXISTS idx_business_channels_phone_id
  ON public.business_channels (phone_number_id);

-- Contact compatibility fields.
ALTER TABLE public.conversation_contacts
  ALTER COLUMN business_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS builder_id uuid REFERENCES public.builders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS lifecycle_stage text NOT NULL DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS temperature text NOT NULL DEFAULT 'warm',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_handoff_at timestamptz;

UPDATE public.conversation_contacts
SET last_message_at = COALESCE(last_message_at, last_active_at);

CREATE INDEX IF NOT EXISTS idx_conversation_contacts_builder
  ON public.conversation_contacts (builder_id);
CREATE INDEX IF NOT EXISTS idx_conversation_contacts_phone
  ON public.conversation_contacts (phone);
CREATE INDEX IF NOT EXISTS idx_conversation_contacts_last
  ON public.conversation_contacts (last_message_at DESC);

-- Thread compatibility fields.
ALTER TABLE public.conversation_threads
  ALTER COLUMN business_id DROP NOT NULL,
  ALTER COLUMN contact_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS playbook_id uuid REFERENCES public.assistant_playbooks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_stage text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS temperature text NOT NULL DEFAULT 'warm',
  ADD COLUMN IF NOT EXISTS business_channel_id uuid REFERENCES public.business_channels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS builder_id uuid REFERENCES public.builders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS ai_mode text NOT NULL DEFAULT 'assistant',
  ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.conversation_threads
  DROP CONSTRAINT IF EXISTS conversation_threads_status_check;

ALTER TABLE public.conversation_threads
  ADD CONSTRAINT conversation_threads_status_check
  CHECK (status = ANY (ARRAY['open'::text, 'pending_human'::text, 'automated'::text, 'resolved'::text, 'archived'::text, 'active'::text, 'bot_paused'::text, 'human_takeover'::text, 'closed'::text]));

UPDATE public.conversation_threads
SET
  status = CASE status
    WHEN 'active' THEN 'open'
    WHEN 'bot_paused' THEN 'automated'
    WHEN 'human_takeover' THEN 'pending_human'
    WHEN 'closed' THEN 'resolved'
    ELSE status
  END,
  last_message_at = COALESCE(last_message_at, updated_at, created_at),
  metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('legacy_lead_stage', lead_stage, 'legacy_temperature', temperature);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_business_channel
  ON public.conversation_threads (business_channel_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_builder
  ON public.conversation_threads (builder_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_status
  ON public.conversation_threads (status);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_last
  ON public.conversation_threads (last_message_at DESC);

DROP INDEX IF EXISTS public.uq_conversation_threads_contact_channel;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_threads_channel_contact
  ON public.conversation_threads (business_channel_id, contact_id)
  WHERE business_channel_id IS NOT NULL AND contact_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_threads_contact_channel_unscoped
  ON public.conversation_threads (contact_id, channel)
  WHERE business_channel_id IS NULL AND contact_id IS NOT NULL;

COMMENT ON COLUMN public.conversation_threads.business_channel_id IS
  'Canonical WhatsAI routing key: phone_number_id resolves to business_channels.id, then channel + contact defines the thread.';

-- Message compatibility fields. Old content/provider_msg_id/role stay intact.
ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'assistant',
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS provider_msg_id text,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.conversation_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS builder_id uuid REFERENCES public.builders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS agent text;

UPDATE public.conversation_messages
SET body = COALESCE(body, content);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_business
  ON public.conversation_messages (business_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_builder
  ON public.conversation_messages (builder_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created
  ON public.conversation_messages (created_at DESC);
