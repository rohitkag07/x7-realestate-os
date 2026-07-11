-- =====================================================================
-- WhatsAI Assistant — Agent Orchestration Layer (Phase 6+)
-- =====================================================================
-- Central queue + cron audit for Summoner-driven dispatch.
-- Requires migrations 001, 002, 004.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.agent_dispatch_queue (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id    uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  lead_id       uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  resident_id   uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  source        text NOT NULL DEFAULT 'system',
  target_agent  text NOT NULL CHECK (target_agent IN ('sales','content','ads','ghost_closer','colony','finance')),
  endpoint      text NOT NULL,
  dedupe_key    text,
  payload       jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','cancelled','skipped')),
  attempts      integer NOT NULL DEFAULT 0,
  max_attempts  integer NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
  locked_at     timestamptz,
  completed_at  timestamptz,
  last_error    text,
  result        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_builder ON public.agent_dispatch_queue (builder_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_status ON public.agent_dispatch_queue (status);
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_due ON public.agent_dispatch_queue (status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_target ON public.agent_dispatch_queue (target_agent);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dispatch_queue_dedupe
  ON public.agent_dispatch_queue (builder_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;
CREATE TRIGGER trg_agent_dispatch_queue_updated_at BEFORE UPDATE ON public.agent_dispatch_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.agent_cron_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id  uuid REFERENCES public.builders(id) ON DELETE SET NULL,
  cron_key    text NOT NULL,
  target_agent text NOT NULL CHECK (target_agent IN ('sales','content','ads','ghost_closer','colony','finance','summoner')),
  status      text NOT NULL DEFAULT 'success' CHECK (status IN ('success','partial','failure','skipped')),
  input       jsonb NOT NULL DEFAULT '{}'::jsonb,
  output      jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_cron_runs_key ON public.agent_cron_runs (cron_key);
CREATE INDEX IF NOT EXISTS idx_agent_cron_runs_target ON public.agent_cron_runs (target_agent);
CREATE INDEX IF NOT EXISTS idx_agent_cron_runs_created ON public.agent_cron_runs (created_at DESC);

ALTER TABLE public.agent_dispatch_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_cron_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dispatch_queue_tenant ON public.agent_dispatch_queue;
CREATE POLICY dispatch_queue_tenant ON public.agent_dispatch_queue FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id())
  WITH CHECK (builder_id = public.auth_builder_id());

DROP POLICY IF EXISTS agent_cron_runs_tenant ON public.agent_cron_runs;
CREATE POLICY agent_cron_runs_tenant ON public.agent_cron_runs FOR ALL TO authenticated
  USING (builder_id IS NULL OR builder_id = public.auth_builder_id())
  WITH CHECK (builder_id IS NULL OR builder_id = public.auth_builder_id());

CREATE OR REPLACE VIEW public.v_dispatch_queue_backlog AS
SELECT
  builder_id,
  target_agent,
  COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
  COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
  COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
  MIN(scheduled_for) FILTER (WHERE status = 'pending') AS next_due_at
FROM public.agent_dispatch_queue
GROUP BY builder_id, target_agent;
