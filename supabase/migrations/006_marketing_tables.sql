-- =====================================================================
-- X7 RealEstate OS — Marketing Engine Tables (Phase 4)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ad_audiences (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id          uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  project_id          uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name                text NOT NULL,
  kind                text NOT NULL CHECK (kind IN ('saved','lookalike','custom','interest','retargeting','geo')),
  meta_audience_id    text,
  google_user_list_id text,
  size_estimate       integer,
  spec                jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_audience_id  uuid REFERENCES public.ad_audiences(id) ON DELETE SET NULL,
  similarity_pct      numeric(4,2),
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','paused','archived')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (builder_id, name)
);
CREATE INDEX IF NOT EXISTS idx_audiences_builder ON public.ad_audiences (builder_id);
CREATE INDEX IF NOT EXISTS idx_audiences_kind    ON public.ad_audiences (kind);
CREATE TRIGGER trg_ad_audiences_updated_at BEFORE UPDATE ON public.ad_audiences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ad_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  snapshot_date   date NOT NULL,
  spend           numeric(10, 2) NOT NULL DEFAULT 0,
  impressions     integer        NOT NULL DEFAULT 0,
  reach           integer        NOT NULL DEFAULT 0,
  clicks          integer        NOT NULL DEFAULT 0,
  leads           integer        NOT NULL DEFAULT 0,
  ctr             numeric(6, 3),
  cpl             numeric(10, 2),
  cpm             numeric(10, 2),
  frequency       numeric(4, 2),
  raw             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_insights_campaign ON public.ad_insights (campaign_id);
CREATE INDEX IF NOT EXISTS idx_insights_date     ON public.ad_insights (snapshot_date DESC);

CREATE TABLE IF NOT EXISTS public.ghost_closer_prospects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  full_name       text NOT NULL,
  phone           text,
  email           text,
  city            text,
  country         text NOT NULL DEFAULT 'IN',
  is_nri          boolean NOT NULL DEFAULT false,
  occupation      text,
  employer        text,
  linkedin_url    text,
  source          text NOT NULL CHECK (source IN ('linkedin','property_portal','99acres','magicbricks','referral','manual','rolodex','enrichment')),
  propensity_score integer CHECK (propensity_score IS NULL OR propensity_score BETWEEN 0 AND 100),
  enrichment      jsonb NOT NULL DEFAULT '{}'::jsonb,
  status          text NOT NULL DEFAULT 'discovered' CHECK (status IN ('discovered','researched','contacted','engaged','converted','suppressed','bounced')),
  last_contacted_at timestamptz,
  converted_lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gc_prospects_builder    ON public.ghost_closer_prospects (builder_id);
CREATE INDEX IF NOT EXISTS idx_gc_prospects_status     ON public.ghost_closer_prospects (status);
CREATE INDEX IF NOT EXISTS idx_gc_prospects_propensity ON public.ghost_closer_prospects (propensity_score DESC);
CREATE INDEX IF NOT EXISTS idx_gc_prospects_phone      ON public.ghost_closer_prospects (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gc_prospects_email      ON public.ghost_closer_prospects (email) WHERE email IS NOT NULL;
CREATE TRIGGER trg_gc_prospects_updated_at BEFORE UPDATE ON public.ghost_closer_prospects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.ghost_closer_outreach (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id     uuid NOT NULL REFERENCES public.ghost_closer_prospects(id) ON DELETE CASCADE,
  builder_id      uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  channel         text NOT NULL CHECK (channel IN ('whatsapp','email','sms','linkedin_inmail')),
  subject         text,
  body            text NOT NULL,
  personalization jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered       boolean NOT NULL DEFAULT false,
  opened          boolean NOT NULL DEFAULT false,
  replied         boolean NOT NULL DEFAULT false,
  external_id     text,
  error           text,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gc_outreach_prospect ON public.ghost_closer_outreach (prospect_id);
CREATE INDEX IF NOT EXISTS idx_gc_outreach_builder  ON public.ghost_closer_outreach (builder_id);
CREATE INDEX IF NOT EXISTS idx_gc_outreach_sent     ON public.ghost_closer_outreach (sent_at DESC);
CREATE TRIGGER trg_gc_outreach_updated_at BEFORE UPDATE ON public.ghost_closer_outreach
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.landing_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  slug            text NOT NULL UNIQUE,
  custom_domain   text,
  hero_image_url  text,
  testimonials    jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs            jsonb NOT NULL DEFAULT '[]'::jsonb,
  gallery_urls    text[] NOT NULL DEFAULT ARRAY[]::text[],
  meta_pixel_id   text,
  google_tag_id   text,
  seo_title       text,
  seo_description text,
  status          text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  views_count     integer NOT NULL DEFAULT 0,
  conversions_count integer NOT NULL DEFAULT 0,
  last_published_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_landing_builder ON public.landing_pages (builder_id);
CREATE INDEX IF NOT EXISTS idx_landing_project ON public.landing_pages (project_id);
CREATE INDEX IF NOT EXISTS idx_landing_status  ON public.landing_pages (status);
CREATE TRIGGER trg_landing_pages_updated_at BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.capi_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id      uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  lead_id         uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  campaign_id     uuid REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
  event_name      text NOT NULL CHECK (event_name IN ('Lead','SiteVisitBooked','SiteVisitCompleted','TokenPaid','BookingCompleted','Purchase')),
  event_time      timestamptz NOT NULL DEFAULT now(),
  event_value     numeric(10, 2),
  currency        text NOT NULL DEFAULT 'INR',
  user_data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_data     jsonb NOT NULL DEFAULT '{}'::jsonb,
  meta_event_id   text,
  sent            boolean NOT NULL DEFAULT false,
  sent_at         timestamptz,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capi_builder ON public.capi_events (builder_id);
CREATE INDEX IF NOT EXISTS idx_capi_lead    ON public.capi_events (lead_id);
CREATE INDEX IF NOT EXISTS idx_capi_sent    ON public.capi_events (sent) WHERE sent = false;

ALTER TABLE public.ad_audiences            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_insights             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghost_closer_prospects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghost_closer_outreach   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capi_events             ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audiences_tenant ON public.ad_audiences;
CREATE POLICY audiences_tenant ON public.ad_audiences FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id()) WITH CHECK (builder_id = public.auth_builder_id());

DROP POLICY IF EXISTS insights_tenant ON public.ad_insights;
CREATE POLICY insights_tenant ON public.ad_insights FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = ad_insights.campaign_id AND c.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = ad_insights.campaign_id AND c.builder_id = public.auth_builder_id()));

DROP POLICY IF EXISTS gc_prospects_tenant ON public.ghost_closer_prospects;
CREATE POLICY gc_prospects_tenant ON public.ghost_closer_prospects FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id()) WITH CHECK (builder_id = public.auth_builder_id());

DROP POLICY IF EXISTS gc_outreach_tenant ON public.ghost_closer_outreach;
CREATE POLICY gc_outreach_tenant ON public.ghost_closer_outreach FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id()) WITH CHECK (builder_id = public.auth_builder_id());

DROP POLICY IF EXISTS landing_tenant ON public.landing_pages;
CREATE POLICY landing_tenant ON public.landing_pages FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id()) WITH CHECK (builder_id = public.auth_builder_id());

DROP POLICY IF EXISTS capi_tenant ON public.capi_events;
CREATE POLICY capi_tenant ON public.capi_events FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id()) WITH CHECK (builder_id = public.auth_builder_id());

CREATE OR REPLACE VIEW public.v_campaign_today AS
SELECT c.id AS campaign_id, c.builder_id, c.project_id, c.platform, c.campaign_name, c.campaign_type, c.status,
       c.budget_daily, c.budget_spent,
       COALESCE(i.spend, 0) AS spend_today, COALESCE(i.impressions, 0) AS impressions_today,
       COALESCE(i.clicks, 0) AS clicks_today, COALESCE(i.leads, 0) AS leads_today,
       i.cpl AS cpl_today, i.ctr AS ctr_today
FROM public.ad_campaigns c
LEFT JOIN public.ad_insights i ON i.campaign_id = c.id AND i.snapshot_date = current_date;

CREATE OR REPLACE VIEW public.v_ghost_closer_funnel AS
SELECT builder_id, COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'discovered') AS discovered,
       COUNT(*) FILTER (WHERE status = 'researched') AS researched,
       COUNT(*) FILTER (WHERE status = 'contacted')  AS contacted,
       COUNT(*) FILTER (WHERE status = 'engaged')    AS engaged,
       COUNT(*) FILTER (WHERE status = 'converted')  AS converted,
       ROUND(AVG(propensity_score) FILTER (WHERE propensity_score IS NOT NULL), 1) AS avg_propensity
FROM public.ghost_closer_prospects
GROUP BY builder_id;
