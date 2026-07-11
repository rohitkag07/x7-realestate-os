-- =====================================================================
-- WhatsAI Assistant — Agent Infrastructure Tables (Phase 2)
-- =====================================================================
-- whatsapp_messages, agent_runs, follow_up_queue, brochure_assets
-- RLS-scoped to builder_id. Requires migrations 001 + 002.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id          uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  lead_id             uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  resident_id         uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  direction           text NOT NULL CHECK (direction IN ('inbound','outbound')),
  phone               text NOT NULL,
  wa_message_id       text,
  message_type        text NOT NULL DEFAULT 'text'
                        CHECK (message_type IN ('text','image','document','video','audio','interactive','template','button_reply','list_reply','location')),
  body                text,
  media_url           text,
  template_name       text,
  template_params     jsonb NOT NULL DEFAULT '[]'::jsonb,
  interactive_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status              text NOT NULL DEFAULT 'queued'
                        CHECK (status IN ('queued','sent','delivered','read','failed','received')),
  error               text,
  agent               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_msg_builder   ON public.whatsapp_messages (builder_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_lead      ON public.whatsapp_messages (lead_id);
CREATE INDEX IF NOT EXISTS idx_wa_msg_phone     ON public.whatsapp_messages (phone);
CREATE INDEX IF NOT EXISTS idx_wa_msg_direction ON public.whatsapp_messages (direction);
CREATE INDEX IF NOT EXISTS idx_wa_msg_created   ON public.whatsapp_messages (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_wa_msg_wa_id ON public.whatsapp_messages (wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE TRIGGER trg_whatsapp_messages_updated_at BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id  uuid REFERENCES public.builders(id) ON DELETE SET NULL,
  agent       text NOT NULL,
  action      text NOT NULL,
  lead_id     uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  project_id  uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  input       jsonb NOT NULL DEFAULT '{}'::jsonb,
  output      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      text NOT NULL DEFAULT 'success' CHECK (status IN ('success','partial','failure')),
  duration_ms integer,
  error       text,
  cost_usd    numeric(8, 4),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_runs_builder ON public.agent_runs (builder_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent   ON public.agent_runs (agent);
CREATE INDEX IF NOT EXISTS idx_agent_runs_lead    ON public.agent_runs (lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created ON public.agent_runs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status  ON public.agent_runs (status);

CREATE TABLE IF NOT EXISTS public.follow_up_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id    uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  lead_id       uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  step          text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','skipped','cancelled','failed')),
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at       timestamptz,
  error         text,
  attempts      integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, step)
);
CREATE INDEX IF NOT EXISTS idx_followup_status    ON public.follow_up_queue (status);
CREATE INDEX IF NOT EXISTS idx_followup_scheduled ON public.follow_up_queue (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_followup_lead      ON public.follow_up_queue (lead_id);
CREATE INDEX IF NOT EXISTS idx_followup_builder   ON public.follow_up_queue (builder_id);
CREATE INDEX IF NOT EXISTS idx_followup_due       ON public.follow_up_queue (status, scheduled_for) WHERE status = 'pending';
CREATE TRIGGER trg_follow_up_queue_updated_at BEFORE UPDATE ON public.follow_up_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.brochure_assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  variant      text NOT NULL DEFAULT 'default',
  pdf_url      text NOT NULL,
  hash         text NOT NULL,
  language     text NOT NULL DEFAULT 'hi-en' CHECK (language IN ('hi','en','hi-en')),
  pages        integer,
  size_bytes   integer,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz,
  UNIQUE (project_id, variant, language)
);
CREATE INDEX IF NOT EXISTS idx_brochures_project ON public.brochure_assets (project_id);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_queue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brochure_assets   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wa_messages_tenant ON public.whatsapp_messages;
CREATE POLICY wa_messages_tenant ON public.whatsapp_messages FOR ALL TO authenticated
  USING      (builder_id = public.auth_builder_id())
  WITH CHECK (builder_id = public.auth_builder_id());

DROP POLICY IF EXISTS agent_runs_tenant ON public.agent_runs;
CREATE POLICY agent_runs_tenant ON public.agent_runs FOR ALL TO authenticated
  USING      (builder_id = public.auth_builder_id())
  WITH CHECK (builder_id = public.auth_builder_id());

DROP POLICY IF EXISTS followup_tenant ON public.follow_up_queue;
CREATE POLICY followup_tenant ON public.follow_up_queue FOR ALL TO authenticated
  USING      (builder_id = public.auth_builder_id())
  WITH CHECK (builder_id = public.auth_builder_id());

DROP POLICY IF EXISTS brochures_tenant ON public.brochure_assets;
CREATE POLICY brochures_tenant ON public.brochure_assets FOR ALL TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = brochure_assets.project_id AND p.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = brochure_assets.project_id AND p.builder_id = public.auth_builder_id()));

CREATE OR REPLACE VIEW public.v_agent_activity_today AS
SELECT
  builder_id, agent,
  COUNT(*) FILTER (WHERE status = 'success')::int AS success,
  COUNT(*) FILTER (WHERE status = 'failure')::int AS failure,
  COUNT(*) FILTER (WHERE created_at >= now() - interval '1 hour')::int AS last_hour,
  MAX(created_at) AS last_run_at
FROM public.agent_runs
WHERE created_at >= date_trunc('day', now())
GROUP BY builder_id, agent;
