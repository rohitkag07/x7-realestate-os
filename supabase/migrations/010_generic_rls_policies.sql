-- =====================================================================
-- WhatsAI Assistant — Generic RLS Policies (Phase 1 Pivot)
-- =====================================================================
-- RLS policies for horizontal multi-business support tables.
-- Requires migration 009.
-- =====================================================================

-- First, ensure RLS is enabled on all the new tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_qualification_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_owner_summaries ENABLE ROW LEVEL SECURITY;

-- Note: We are using public.auth_builder_id() from the previous schema for tenant isolation,
-- as business_id == builder_id in the migration mapping. 
-- For a cleaner transition later, we could rename this to auth_business_id().

-- 1. businesses
DROP POLICY IF EXISTS businesses_tenant ON public.businesses;
CREATE POLICY businesses_tenant ON public.businesses FOR ALL TO authenticated
  USING      (id = public.auth_builder_id())
  WITH CHECK (id = public.auth_builder_id());

-- 2. business_profiles
DROP POLICY IF EXISTS business_profiles_tenant ON public.business_profiles;
CREATE POLICY business_profiles_tenant ON public.business_profiles FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

-- 3. business_channels
DROP POLICY IF EXISTS business_channels_tenant ON public.business_channels;
CREATE POLICY business_channels_tenant ON public.business_channels FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

-- 4. trial_accounts
DROP POLICY IF EXISTS trial_accounts_tenant ON public.trial_accounts;
CREATE POLICY trial_accounts_tenant ON public.trial_accounts FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

-- 5. assistant_playbooks
DROP POLICY IF EXISTS assistant_playbooks_tenant ON public.assistant_playbooks;
CREATE POLICY assistant_playbooks_tenant ON public.assistant_playbooks FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

-- 6. assistant_knowledge_items
DROP POLICY IF EXISTS assistant_knowledge_items_tenant ON public.assistant_knowledge_items;
CREATE POLICY assistant_knowledge_items_tenant ON public.assistant_knowledge_items FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

-- 7. conversation_contacts
DROP POLICY IF EXISTS conversation_contacts_tenant ON public.conversation_contacts;
CREATE POLICY conversation_contacts_tenant ON public.conversation_contacts FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

-- 8. conversation_threads
DROP POLICY IF EXISTS conversation_threads_tenant ON public.conversation_threads;
CREATE POLICY conversation_threads_tenant ON public.conversation_threads FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

-- 9. conversation_messages (scoped via thread_id -> business_id)
DROP POLICY IF EXISTS conversation_messages_tenant ON public.conversation_messages;
CREATE POLICY conversation_messages_tenant ON public.conversation_messages FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.conversation_threads t WHERE t.id = conversation_messages.thread_id AND t.business_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversation_threads t WHERE t.id = conversation_messages.thread_id AND t.business_id = public.auth_builder_id()));

-- 10. lead_qualification_answers (scoped via thread_id -> business_id)
DROP POLICY IF EXISTS lead_qualification_answers_tenant ON public.lead_qualification_answers;
CREATE POLICY lead_qualification_answers_tenant ON public.lead_qualification_answers FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.conversation_threads t WHERE t.id = lead_qualification_answers.thread_id AND t.business_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversation_threads t WHERE t.id = lead_qualification_answers.thread_id AND t.business_id = public.auth_builder_id()));

-- 11. appointments
DROP POLICY IF EXISTS appointments_tenant ON public.appointments;
CREATE POLICY appointments_tenant ON public.appointments FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

-- 12. handoff_events
DROP POLICY IF EXISTS handoff_events_tenant ON public.handoff_events;
CREATE POLICY handoff_events_tenant ON public.handoff_events FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

-- 13. daily_owner_summaries
DROP POLICY IF EXISTS daily_owner_summaries_tenant ON public.daily_owner_summaries;
CREATE POLICY daily_owner_summaries_tenant ON public.daily_owner_summaries FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());
