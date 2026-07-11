-- =====================================================================
-- WhatsAI Assistant — Row-Level Security Policies
-- =====================================================================
-- Multi-tenant isolation by builder_id. Every tenant table has a
-- builder_id either directly or transitively via project_id.
--
-- Auth model:
--   • Supabase Auth users.raw_app_meta_data->>'builder_id' carries the
--     tenant ID after onboarding (set by an onboarding edge function).
--   • Service role (used by Cloud Run agents) bypasses RLS entirely
--     via the SUPABASE_SERVICE_ROLE_KEY — agents authenticate at the
--     application layer with AGENT_SECRET.
--   • Authenticated dashboard users see only their builder's rows.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper: extract the current user's builder_id from JWT app metadata
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_builder_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    (current_setting('request.jwt.claims', true)::jsonb
      -> 'app_metadata' ->> 'builder_id'),
    ''
  )::uuid;
$$;

-- ---------------------------------------------------------------------
-- Enable RLS on every tenant table
-- ---------------------------------------------------------------------
ALTER TABLE public.builders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_invoices   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors               ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- BUILDERS — Only the owning builder may read/update its own row
-- =====================================================================
DROP POLICY IF EXISTS builders_select ON public.builders;
CREATE POLICY builders_select ON public.builders
  FOR SELECT TO authenticated
  USING (id = public.auth_builder_id());

DROP POLICY IF EXISTS builders_update ON public.builders;
CREATE POLICY builders_update ON public.builders
  FOR UPDATE TO authenticated
  USING (id = public.auth_builder_id())
  WITH CHECK (id = public.auth_builder_id());

-- INSERT/DELETE handled by service role only (onboarding / billing ops)


-- =====================================================================
-- PROJECTS — direct builder_id
-- =====================================================================
DROP POLICY IF EXISTS projects_tenant ON public.projects;
CREATE POLICY projects_tenant ON public.projects
  FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id())
  WITH CHECK (builder_id = public.auth_builder_id());


-- =====================================================================
-- LEADS — direct builder_id
-- =====================================================================
DROP POLICY IF EXISTS leads_tenant ON public.leads;
CREATE POLICY leads_tenant ON public.leads
  FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id())
  WITH CHECK (builder_id = public.auth_builder_id());


-- =====================================================================
-- PLOTS — via project_id → builders
-- =====================================================================
DROP POLICY IF EXISTS plots_tenant ON public.plots;
CREATE POLICY plots_tenant ON public.plots
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = plots.project_id
      AND p.builder_id = public.auth_builder_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = plots.project_id
      AND p.builder_id = public.auth_builder_id()
  ));


-- =====================================================================
-- SITE_VISITS — via project_id → builders
-- =====================================================================
DROP POLICY IF EXISTS site_visits_tenant ON public.site_visits;
CREATE POLICY site_visits_tenant ON public.site_visits
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = site_visits.project_id
      AND p.builder_id = public.auth_builder_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = site_visits.project_id
      AND p.builder_id = public.auth_builder_id()
  ));


-- =====================================================================
-- BOOKINGS — via project_id → builders
-- =====================================================================
DROP POLICY IF EXISTS bookings_tenant ON public.bookings;
CREATE POLICY bookings_tenant ON public.bookings
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = bookings.project_id
      AND p.builder_id = public.auth_builder_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = bookings.project_id
      AND p.builder_id = public.auth_builder_id()
  ));


-- =====================================================================
-- CONTENT_CALENDAR — direct builder_id
-- =====================================================================
DROP POLICY IF EXISTS content_calendar_tenant ON public.content_calendar;
CREATE POLICY content_calendar_tenant ON public.content_calendar
  FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id())
  WITH CHECK (builder_id = public.auth_builder_id());


-- =====================================================================
-- AD_CAMPAIGNS — direct builder_id
-- =====================================================================
DROP POLICY IF EXISTS ad_campaigns_tenant ON public.ad_campaigns;
CREATE POLICY ad_campaigns_tenant ON public.ad_campaigns
  FOR ALL TO authenticated
  USING (builder_id = public.auth_builder_id())
  WITH CHECK (builder_id = public.auth_builder_id());


-- =====================================================================
-- RESIDENTS — via project_id → builders
-- =====================================================================
DROP POLICY IF EXISTS residents_tenant ON public.residents;
CREATE POLICY residents_tenant ON public.residents
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = residents.project_id
      AND p.builder_id = public.auth_builder_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = residents.project_id
      AND p.builder_id = public.auth_builder_id()
  ));


-- =====================================================================
-- MAINTENANCE_INVOICES — via project_id → builders
-- =====================================================================
DROP POLICY IF EXISTS invoices_tenant ON public.maintenance_invoices;
CREATE POLICY invoices_tenant ON public.maintenance_invoices
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = maintenance_invoices.project_id
      AND p.builder_id = public.auth_builder_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = maintenance_invoices.project_id
      AND p.builder_id = public.auth_builder_id()
  ));


-- =====================================================================
-- COMPLAINTS — via project_id → builders
-- =====================================================================
DROP POLICY IF EXISTS complaints_tenant ON public.complaints;
CREATE POLICY complaints_tenant ON public.complaints
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = complaints.project_id
      AND p.builder_id = public.auth_builder_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = complaints.project_id
      AND p.builder_id = public.auth_builder_id()
  ));


-- =====================================================================
-- VISITORS — via project_id → builders
-- =====================================================================
DROP POLICY IF EXISTS visitors_tenant ON public.visitors;
CREATE POLICY visitors_tenant ON public.visitors
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = visitors.project_id
      AND p.builder_id = public.auth_builder_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = visitors.project_id
      AND p.builder_id = public.auth_builder_id()
  ));


-- =====================================================================
-- END OF MIGRATION 002
-- =====================================================================
