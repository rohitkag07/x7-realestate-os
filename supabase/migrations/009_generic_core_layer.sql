-- =====================================================================
-- X7 WhatsAI Assistant — Generic Core Layer (Phase 1 Pivot)
-- =====================================================================
-- Introduces horizontal multi-business support, assistant playbooks,
-- generic conversations, appointments, and handoffs.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABLE: businesses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.businesses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  phone           text NOT NULL,
  email           text,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'trial')),
  plan            text NOT NULL DEFAULT 'starter',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: business_profiles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  vertical        text NOT NULL DEFAULT 'real_estate' CHECK (vertical IN ('real_estate', 'clinic', 'coaching', 'gym', 'local_service', 'other')),
  company_name    text,
  address         text,
  city            text,
  logo_url        text,
  timezone        text NOT NULL DEFAULT 'Asia/Kolkata',
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

CREATE TRIGGER trg_business_profiles_updated_at
  BEFORE UPDATE ON public.business_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: business_channels
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_channels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  provider        text NOT NULL DEFAULT 'meta_whatsapp' CHECK (provider IN ('meta_whatsapp', 'telegram', 'web')),
  channel_id      text NOT NULL, -- e.g. Phone Number ID for WhatsApp
  channel_phone   text, -- e.g. actual phone number
  config          jsonb NOT NULL DEFAULT '{}'::jsonb, -- e.g. tokens
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, channel_id)
);

CREATE TRIGGER trg_business_channels_updated_at
  BEFORE UPDATE ON public.business_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: trial_accounts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trial_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  trial_start     timestamptz NOT NULL DEFAULT now(),
  trial_end       timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'converted')),
  success_metric_met boolean NOT NULL DEFAULT false,
  metrics         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

CREATE TRIGGER trg_trial_accounts_updated_at
  BEFORE UPDATE ON public.trial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: assistant_playbooks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_playbooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name            text NOT NULL,
  vertical        text NOT NULL,
  system_prompt   text,
  qualification_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  handoff_rules   jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_assistant_playbooks_updated_at
  BEFORE UPDATE ON public.assistant_playbooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: assistant_knowledge_items
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assistant_knowledge_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  playbook_id     uuid REFERENCES public.assistant_playbooks(id) ON DELETE SET NULL,
  type            text NOT NULL CHECK (type IN ('faq', 'service', 'policy', 'document')),
  title           text NOT NULL,
  content         text,
  media_url       text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_assistant_knowledge_items_updated_at
  BEFORE UPDATE ON public.assistant_knowledge_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: conversation_contacts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  phone           text NOT NULL,
  name            text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_active_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, phone)
);

CREATE TRIGGER trg_conversation_contacts_updated_at
  BEFORE UPDATE ON public.conversation_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: conversation_threads
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES public.conversation_contacts(id) ON DELETE CASCADE,
  playbook_id     uuid REFERENCES public.assistant_playbooks(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'bot_paused', 'human_takeover', 'closed')),
  lead_stage      text NOT NULL DEFAULT 'new',
  temperature     text NOT NULL DEFAULT 'cold' CHECK (temperature IN ('hot', 'warm', 'cold')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_conversation_threads_updated_at
  BEFORE UPDATE ON public.conversation_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: conversation_messages
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  direction       text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  role            text NOT NULL CHECK (role IN ('user', 'assistant', 'human_operator')),
  content         text,
  media_url       text,
  message_type    text NOT NULL DEFAULT 'text',
  provider_msg_id text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- TABLE: lead_qualification_answers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_qualification_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  question_key    text NOT NULL,
  answer_value    text NOT NULL,
  confidence      numeric(3, 2),
  extracted_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(thread_id, question_key)
);

-- ---------------------------------------------------------------------
-- TABLE: appointments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES public.conversation_contacts(id) ON DELETE CASCADE,
  thread_id       uuid REFERENCES public.conversation_threads(id) ON DELETE SET NULL,
  title           text NOT NULL,
  appointment_type text NOT NULL CHECK (appointment_type IN ('site_visit', 'clinic_visit', 'demo', 'callback', 'other')),
  scheduled_at    timestamptz NOT NULL,
  status          text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: handoff_events
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.handoff_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  thread_id       uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  reason          text NOT NULL,
  priority        text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
  summary         text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_handoff_events_updated_at
  BEFORE UPDATE ON public.handoff_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- TABLE: daily_owner_summaries
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_owner_summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  date            date NOT NULL,
  summary_text    text NOT NULL,
  metrics         jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, date)
);

-- =====================================================================
-- MIGRATION: Map Existing Builders to Businesses
-- =====================================================================

-- For backwards compatibility, we ensure every existing builder becomes a business.
-- We use the builder ID as the business ID to keep foreign keys simple if needed,
-- or we can just map them directly.

INSERT INTO public.businesses (id, name, phone, email, status, plan, created_at, updated_at)
SELECT id, name, phone, email, status, plan, created_at, updated_at
FROM public.builders
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.business_profiles (business_id, vertical, company_name, city, logo_url, created_at, updated_at)
SELECT id, 'real_estate', company_name, city, logo_url, created_at, updated_at
FROM public.builders
ON CONFLICT (business_id) DO NOTHING;

INSERT INTO public.assistant_playbooks (business_id, name, vertical, created_at, updated_at)
SELECT id, 'X7 SiteVisit AI', 'real_estate', now(), now()
FROM public.builders
ON CONFLICT DO NOTHING;

-- Map existing whatsapp numbers as channels
INSERT INTO public.business_channels (business_id, provider, channel_id, channel_phone)
SELECT id, 'meta_whatsapp', whatsapp_number, whatsapp_number
FROM public.builders
WHERE whatsapp_number IS NOT NULL
ON CONFLICT DO NOTHING;

-- Map existing leads to conversation_contacts
INSERT INTO public.conversation_contacts (business_id, phone, name, created_at, updated_at)
SELECT builder_id, phone, name, created_at, updated_at
FROM public.leads
ON CONFLICT (business_id, phone) DO NOTHING;
