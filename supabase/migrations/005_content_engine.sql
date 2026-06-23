-- =====================================================================
-- X7 RealEstate OS — Content Engine Tables (Phase 3)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.content_jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  content_id      uuid REFERENCES public.content_calendar(id) ON DELETE SET NULL,
  job_type        text NOT NULL CHECK (job_type IN ('remotion_render','higgsfield_image','higgsfield_video','higgsfield_ad_pack','higgsfield_score','meta_publish','calendar_generate','restyle')),
  provider        text NOT NULL CHECK (provider IN ('remotion','higgsfield','openai','meta','google','self')),
  status          text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  request         jsonb NOT NULL DEFAULT '{}'::jsonb,
  response        jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_url      text,
  external_job_id text,
  attempts        integer NOT NULL DEFAULT 0,
  duration_ms     integer,
  cost_usd        numeric(8, 4),
  error           text,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_content_jobs_builder  ON public.content_jobs (builder_id);
CREATE INDEX IF NOT EXISTS idx_content_jobs_content  ON public.content_jobs (content_id);
CREATE INDEX IF NOT EXISTS idx_content_jobs_status   ON public.content_jobs (status);
CREATE INDEX IF NOT EXISTS idx_content_jobs_provider ON public.content_jobs (provider);
CREATE INDEX IF NOT EXISTS idx_content_jobs_external ON public.content_jobs (external_job_id) WHERE external_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_jobs_created  ON public.content_jobs (created_at DESC);
CREATE TRIGGER trg_content_jobs_updated_at BEFORE UPDATE ON public.content_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.content_pillars (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  pillar          text NOT NULL,
  name            text NOT NULL,
  description     text,
  weekly_slots    integer NOT NULL DEFAULT 1 CHECK (weekly_slots >= 0),
  preferred_day   integer CHECK (preferred_day BETWEEN 0 AND 6),
  preferred_time  text,
  ai_prompt_seed  text,
  enabled         boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (builder_id, pillar)
);
CREATE INDEX IF NOT EXISTS idx_pillars_builder ON public.content_pillars (builder_id);
CREATE TRIGGER trg_content_pillars_updated_at BEFORE UPDATE ON public.content_pillars
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.content_engagement_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id      uuid NOT NULL REFERENCES public.content_calendar(id) ON DELETE CASCADE,
  snapshot_at     timestamptz NOT NULL DEFAULT now(),
  reach           integer NOT NULL DEFAULT 0,
  impressions     integer NOT NULL DEFAULT 0,
  likes           integer NOT NULL DEFAULT 0,
  comments        integer NOT NULL DEFAULT 0,
  shares          integer NOT NULL DEFAULT 0,
  saves           integer NOT NULL DEFAULT 0,
  video_views     integer NOT NULL DEFAULT 0,
  profile_visits  integer NOT NULL DEFAULT 0,
  whatsapp_clicks integer NOT NULL DEFAULT 0,
  raw             jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_engagement_content  ON public.content_engagement_history (content_id);
CREATE INDEX IF NOT EXISTS idx_engagement_snapshot ON public.content_engagement_history (snapshot_at DESC);

CREATE TABLE IF NOT EXISTS public.ad_creative_variants (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id      uuid NOT NULL REFERENCES public.content_calendar(id) ON DELETE CASCADE,
  campaign_id     uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  variant_label   text NOT NULL,
  media_url       text NOT NULL,
  thumbnail_url   text,
  caption         text,
  cta_text        text,
  virality_score  integer CHECK (virality_score IS NULL OR virality_score BETWEEN 0 AND 100),
  impressions     integer NOT NULL DEFAULT 0,
  clicks          integer NOT NULL DEFAULT 0,
  conversions     integer NOT NULL DEFAULT 0,
  is_winner       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, variant_label)
);
CREATE INDEX IF NOT EXISTS idx_variants_content  ON public.ad_creative_variants (content_id);
CREATE INDEX IF NOT EXISTS idx_variants_campaign ON public.ad_creative_variants (campaign_id);
CREATE TRIGGER trg_ad_creative_variants_updated_at BEFORE UPDATE ON public.ad_creative_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.content_jobs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pillars              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_engagement_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_creative_variants         ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_jobs_tenant ON public.content_jobs;
CREATE POLICY content_jobs_tenant ON public.content_jobs FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id())
  WITH CHECK (builder_id = public.auth_builder_id());

DROP POLICY IF EXISTS content_pillars_tenant ON public.content_pillars;
CREATE POLICY content_pillars_tenant ON public.content_pillars FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id())
  WITH CHECK (builder_id = public.auth_builder_id());

DROP POLICY IF EXISTS engagement_tenant ON public.content_engagement_history;
CREATE POLICY engagement_tenant ON public.content_engagement_history FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.content_calendar c WHERE c.id = content_engagement_history.content_id AND c.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.content_calendar c WHERE c.id = content_engagement_history.content_id AND c.builder_id = public.auth_builder_id()));

DROP POLICY IF EXISTS variants_tenant ON public.ad_creative_variants;
CREATE POLICY variants_tenant ON public.ad_creative_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.content_calendar c WHERE c.id = ad_creative_variants.content_id AND c.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.content_calendar c WHERE c.id = ad_creative_variants.content_id AND c.builder_id = public.auth_builder_id()));

CREATE OR REPLACE VIEW public.v_content_pipeline AS
SELECT c.builder_id, c.id AS content_id, c.project_id, c.content_type, c.platform, c.pillar, c.status,
       c.scheduled_for, c.virality_score,
       (c.engagement->>'reach')::int       AS reach,
       (c.engagement->>'video_views')::int AS video_views,
       (c.engagement->>'likes')::int       AS likes,
       COUNT(j.id) FILTER (WHERE j.status IN ('queued','running'))::int AS pending_jobs,
       COUNT(j.id) FILTER (WHERE j.status = 'failed')::int               AS failed_jobs
FROM public.content_calendar c
LEFT JOIN public.content_jobs j ON j.content_id = c.id
GROUP BY c.id;
