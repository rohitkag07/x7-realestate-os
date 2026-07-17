-- WhatsAI: tenant-scoped follow-up automation and team assignment.

CREATE TABLE IF NOT EXISTS public.followup_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  playbook_id uuid REFERENCES public.assistant_playbooks(id) ON DELETE SET NULL,
  name text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT followup_sequences_steps_array CHECK (jsonb_typeof(steps) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_followup_sequences_active_playbook
  ON public.followup_sequences (business_id, COALESCE(playbook_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE active;

CREATE TABLE IF NOT EXISTS public.followup_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid NOT NULL REFERENCES public.followup_sequences(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.conversation_threads(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.conversation_contacts(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  step_index integer NOT NULL DEFAULT 0 CHECK (step_index >= 0),
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  locked_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'cancelled', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, thread_id, step_index)
);

CREATE INDEX IF NOT EXISTS followup_jobs_pending_idx
  ON public.followup_jobs (scheduled_at, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS followup_jobs_business_idx
  ON public.followup_jobs (business_id, status);

CREATE TABLE IF NOT EXISTS public.business_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  role text NOT NULL DEFAULT 'agent' CHECK (role IN ('owner', 'manager', 'agent')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

ALTER TABLE public.conversation_threads
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS threads_assigned_user_idx
  ON public.conversation_threads (assigned_user_id, business_id);

ALTER TABLE public.followup_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS followup_sequences_tenant ON public.followup_sequences;
CREATE POLICY followup_sequences_tenant ON public.followup_sequences FOR ALL TO authenticated
  USING (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

DROP POLICY IF EXISTS followup_jobs_tenant ON public.followup_jobs;
CREATE POLICY followup_jobs_tenant ON public.followup_jobs FOR ALL TO authenticated
  USING (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

DROP POLICY IF EXISTS business_members_tenant ON public.business_members;
CREATE POLICY business_members_tenant ON public.business_members FOR ALL TO authenticated
  USING (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());
