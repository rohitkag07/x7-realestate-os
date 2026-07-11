-- =====================================================================
-- WhatsAI Assistant — Initial Schema Migration
-- =====================================================================
-- Codename: Project NEEV (नींव — The Foundation)
-- Author:   Rohit Kag — Founder, Xero Seven
-- Date:     May 2026
-- Spec:     docs/.docs/legacy/realestate-vertical-blueprint.md — Section 3
--
-- This migration creates the complete 12-table foundation for the
-- WhatsAI Assistant platform: Marketing, Sales, and Colony Management
-- for Tier 2 Indian Builders.
--
-- Run order:
--   1. 001_initial_schema.sql  ← THIS FILE
--   2. 002_rls_policies.sql
--   3. 003_seed_data.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- Generic updated_at trigger function (reused across all tables)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================================
-- TABLE 1: builders — The tenant / customer (real estate company)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.builders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  company_name    text NOT NULL,
  phone           text NOT NULL,
  email           text,
  city            text NOT NULL,
  whatsapp_number text,
  logo_url        text,
  brand_colors    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  plan            text        NOT NULL DEFAULT 'starter'
                    CHECK (plan IN ('starter','growth','premium','enterprise')),
  status          text        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','paused','cancelled','trial')),
  trial_ends_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_builders_status      ON public.builders (status);
CREATE INDEX IF NOT EXISTS idx_builders_city        ON public.builders (city);
CREATE INDEX IF NOT EXISTS idx_builders_phone       ON public.builders (phone);

CREATE TRIGGER trg_builders_updated_at
  BEFORE UPDATE ON public.builders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 2: projects — Real estate projects (colonies, apartments, etc.)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id         uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  name               text NOT NULL,
  slug               text NOT NULL UNIQUE,
  location           text NOT NULL,
  city               text NOT NULL,
  latitude           numeric(10, 7),
  longitude          numeric(10, 7),
  total_plots        integer NOT NULL CHECK (total_plots >= 0),
  available_plots    integer NOT NULL CHECK (available_plots >= 0),
  price_range_min    integer,   -- In Lakhs (₹)
  price_range_max    integer,   -- In Lakhs (₹)
  rera_number        text,
  project_type       text NOT NULL DEFAULT 'plots'
                       CHECK (project_type IN ('plots','villas','apartments','commercial','mixed')),
  amenities          text[]   NOT NULL DEFAULT ARRAY[]::text[],
  nearby_landmarks   jsonb    NOT NULL DEFAULT '[]'::jsonb,
                                -- Shape: [{name, type, distance_km}]
  brochure_url       text,
  landing_page_url   text,
  hero_image_url     text,
  description        text,
  status             text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('pre_launch','active','last_units','sold_out','paused')),
  launched_at        timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_builder_id  ON public.projects (builder_id);
CREATE INDEX IF NOT EXISTS idx_projects_status      ON public.projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_city        ON public.projects (city);
CREATE INDEX IF NOT EXISTS idx_projects_slug        ON public.projects (slug);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 3: leads — Prospective buyers (created BEFORE plots
--                  because plots.booked_by references leads.id)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  builder_id         uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  name               text NOT NULL,
  phone              text NOT NULL,
  email              text,
  source             text NOT NULL
                       CHECK (source IN (
                         'meta_ad','google_ad','website','whatsapp',
                         'referral','walk_in','ghost_closer','telegram','manual'
                       )),
  campaign_id        text,                -- Meta/Google campaign ID
  ad_id              text,                -- Specific creative ID
  budget_range       text                  -- '15-25L', '25-40L', '40L+'
                       CHECK (budget_range IS NULL OR budget_range IN ('15-25L','25-40L','40L+','undisclosed')),
  purpose            text                  -- self_use / investment / undecided
                       CHECK (purpose IS NULL OR purpose IN ('self_use','investment','undecided')),
  timeline           text                  -- immediate / 3_months / 6_months+
                       CHECK (timeline IS NULL OR timeline IN ('immediate','3_months','6_months+')),
  lead_score         integer NOT NULL DEFAULT 0
                       CHECK (lead_score BETWEEN 0 AND 100),
  lead_stage         text    NOT NULL DEFAULT 'new'
                       CHECK (lead_stage IN (
                         'new','qualified','visit_scheduled','visited',
                         'negotiation','booked','lost'
                       )),
  temperature        text    NOT NULL DEFAULT 'cold'
                       CHECK (temperature IN ('hot','warm','cold')),
  lost_reason        text,
  assigned_to        text,                 -- Sales person name
  notes              text,
  whatsapp_session   jsonb   NOT NULL DEFAULT '{}'::jsonb,
  last_contacted_at  timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_builder_id   ON public.leads (builder_id);
CREATE INDEX IF NOT EXISTS idx_leads_project_id   ON public.leads (project_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone        ON public.leads (phone);
CREATE INDEX IF NOT EXISTS idx_leads_stage        ON public.leads (lead_stage);
CREATE INDEX IF NOT EXISTS idx_leads_source       ON public.leads (source);
CREATE INDEX IF NOT EXISTS idx_leads_temperature  ON public.leads (temperature);
CREATE INDEX IF NOT EXISTS idx_leads_created_at   ON public.leads (created_at DESC);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 4: plots — Individual plot inventory for plotted developments
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.plots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  plot_number     text NOT NULL,
  block           text,
  area_sqft       integer NOT NULL CHECK (area_sqft > 0),
  dimension       text,                  -- "30x50"
  facing          text                   -- North, East, Corner, etc.
                    CHECK (facing IS NULL OR facing IN (
                      'North','South','East','West',
                      'North-East','North-West','South-East','South-West',
                      'Corner','Park-Facing','Road-Facing'
                    )),
  price_per_sqft  integer,
  total_price     integer,
  status          text NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','token','booked','registered','sold','blocked')),
  booked_by       uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  token_amount    integer,
  token_date      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, plot_number)
);

CREATE INDEX IF NOT EXISTS idx_plots_project_id ON public.plots (project_id);
CREATE INDEX IF NOT EXISTS idx_plots_status     ON public.plots (status);
CREATE INDEX IF NOT EXISTS idx_plots_booked_by  ON public.plots (booked_by);

CREATE TRIGGER trg_plots_updated_at
  BEFORE UPDATE ON public.plots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 5: site_visits — Scheduled and completed site visits
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.site_visits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scheduled_date    date NOT NULL,
  scheduled_time    text NOT NULL,        -- '10:00','14:00','16:00' or freeform
  status            text NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','confirmed','completed','no_show','cancelled','rescheduled')),
  feedback          text,
  interest_level    text
                      CHECK (interest_level IS NULL OR interest_level IN ('very_high','high','medium','low')),
  follow_up_action  text,
  reminder_sent_at  timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_visits_lead_id        ON public.site_visits (lead_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_project_id     ON public.site_visits (project_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_scheduled_date ON public.site_visits (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_site_visits_status         ON public.site_visits (status);

CREATE TRIGGER trg_site_visits_updated_at
  BEFORE UPDATE ON public.site_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 6: bookings — Confirmed bookings with token / full payment
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  plot_id           uuid REFERENCES public.plots(id) ON DELETE SET NULL,
  token_amount      integer NOT NULL CHECK (token_amount >= 0),
  total_amount      integer,
  payment_mode      text
                      CHECK (payment_mode IS NULL OR payment_mode IN ('upi','neft','imps','rtgs','cash','cheque','card')),
  payment_reference text,
  upi_payment_link  text,
  booking_date      timestamptz NOT NULL DEFAULT now(),
  status            text NOT NULL DEFAULT 'token_paid'
                      CHECK (status IN ('token_paid','agreement','registered','completed','cancelled','refunded')),
  agreement_url     text,
  registry_url      text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_lead_id    ON public.bookings (lead_id);
CREATE INDEX IF NOT EXISTS idx_bookings_project_id ON public.bookings (project_id);
CREATE INDEX IF NOT EXISTS idx_bookings_plot_id    ON public.bookings (plot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_date       ON public.bookings (booking_date DESC);

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 7: content_calendar — All scheduled and published content
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.content_calendar (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  builder_id      uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  content_type    text NOT NULL
                    CHECK (content_type IN ('post','reel','story','video','ad_creative','carousel','long_form_video')),
  platform        text NOT NULL
                    CHECK (platform IN ('instagram','facebook','youtube','google_ads','linkedin','twitter','whatsapp_status')),
  pillar          text                          -- location / construction / educational / social_proof / lifestyle / investment / engagement / festival
                    CHECK (pillar IS NULL OR pillar IN (
                      'location_advantage','construction_update','educational',
                      'social_proof','lifestyle','investment_logic','engagement','festival','ad'
                    )),
  caption         text,
  caption_hindi   text,
  hashtags        text[] NOT NULL DEFAULT ARRAY[]::text[],
  media_url       text,
  thumbnail_url   text,
  media_type      text
                    CHECK (media_type IS NULL OR media_type IN ('image','video','carousel','gif')),
  scheduled_for   timestamptz,
  published_at    timestamptz,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','generating','review','approved','scheduled','published','failed','archived')),
  engagement      jsonb NOT NULL DEFAULT '{}'::jsonb,
                                                  -- {likes, comments, shares, saves, reach, impressions, video_views}
  virality_score  integer
                    CHECK (virality_score IS NULL OR virality_score BETWEEN 0 AND 100),
  generated_by    text,                            -- 'remotion' | 'higgsfield' | 'gpt-4o' | 'manual'
  generation_prompt text,
  remotion_composition text,                       -- Composition name if Remotion
  higgsfield_job_id text,                          -- Job ID if Higgsfield
  external_post_id text,                           -- Meta/IG post ID after publish
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_builder_id   ON public.content_calendar (builder_id);
CREATE INDEX IF NOT EXISTS idx_content_project_id   ON public.content_calendar (project_id);
CREATE INDEX IF NOT EXISTS idx_content_status       ON public.content_calendar (status);
CREATE INDEX IF NOT EXISTS idx_content_platform     ON public.content_calendar (platform);
CREATE INDEX IF NOT EXISTS idx_content_scheduled    ON public.content_calendar (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_content_type         ON public.content_calendar (content_type);

CREATE TRIGGER trg_content_calendar_updated_at
  BEFORE UPDATE ON public.content_calendar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 8: ad_campaigns — Meta / Google ad campaigns and budgets
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  builder_id        uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  platform          text NOT NULL
                      CHECK (platform IN ('meta','google','youtube','linkedin')),
  campaign_name     text NOT NULL,
  campaign_type     text NOT NULL
                      CHECK (campaign_type IN ('awareness','consideration','conversion','retargeting','lead_gen','click_to_whatsapp')),
  objective         text,
  budget_daily      integer CHECK (budget_daily IS NULL OR budget_daily >= 0),
  budget_total      integer CHECK (budget_total IS NULL OR budget_total >= 0),
  budget_spent      integer NOT NULL DEFAULT 0 CHECK (budget_spent >= 0),
  impressions       integer NOT NULL DEFAULT 0,
  clicks            integer NOT NULL DEFAULT 0,
  leads_generated   integer NOT NULL DEFAULT 0,
  site_visits_attributed integer NOT NULL DEFAULT 0,
  bookings_attributed    integer NOT NULL DEFAULT 0,
  cpl               integer,                          -- Cost per lead
  cpv               integer,                          -- Cost per site visit
  ctr               numeric(5, 2),                    -- Click-through rate %
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('draft','active','paused','completed','archived')),
  meta_campaign_id  text,
  meta_adset_id     text,
  google_campaign_id text,
  audience          jsonb NOT NULL DEFAULT '{}'::jsonb, -- Targeting JSON
  start_date        date,
  end_date          date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_builder_id ON public.ad_campaigns (builder_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_project_id ON public.ad_campaigns (project_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_platform   ON public.ad_campaigns (platform);
CREATE INDEX IF NOT EXISTS idx_campaigns_status     ON public.ad_campaigns (status);

CREATE TRIGGER trg_ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 9: residents — Colony residents (post-sale)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.residents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  plot_id         uuid REFERENCES public.plots(id) ON DELETE SET NULL,
  name            text NOT NULL,
  phone           text NOT NULL,
  email           text,
  alt_phone       text,
  family_members  jsonb NOT NULL DEFAULT '[]'::jsonb,    -- [{name, relation, phone}]
  vehicles        jsonb NOT NULL DEFAULT '[]'::jsonb,    -- [{type, number, color}]
  move_in_date    date,
  move_out_date   date,
  status          text NOT NULL DEFAULT 'owner'
                    CHECK (status IN ('owner','tenant','vacant','co_owner')),
  emergency_contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  documents       jsonb NOT NULL DEFAULT '[]'::jsonb,    -- Document refs
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_residents_project_id ON public.residents (project_id);
CREATE INDEX IF NOT EXISTS idx_residents_plot_id    ON public.residents (plot_id);
CREATE INDEX IF NOT EXISTS idx_residents_phone      ON public.residents (phone);
CREATE INDEX IF NOT EXISTS idx_residents_status     ON public.residents (status);

CREATE TRIGGER trg_residents_updated_at
  BEFORE UPDATE ON public.residents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 10: maintenance_invoices — Monthly colony maintenance billing
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  resident_id       uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  plot_id           uuid REFERENCES public.plots(id) ON DELETE SET NULL,
  month             text NOT NULL,    -- 'YYYY-MM' e.g. '2026-06'
  amount            integer NOT NULL CHECK (amount >= 0),
  due_date          date    NOT NULL,
  paid_date         date,
  payment_mode      text
                      CHECK (payment_mode IS NULL OR payment_mode IN ('upi','neft','imps','rtgs','cash','cheque','card')),
  payment_reference text,
  upi_payment_link  text,
  invoice_pdf_url   text,
  receipt_pdf_url   text,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','overdue','waived','cancelled')),
  late_fee          integer NOT NULL DEFAULT 0 CHECK (late_fee >= 0),
  reminder_sent_at  timestamptz,
  reminder_count    integer NOT NULL DEFAULT 0,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (resident_id, month)
);

CREATE INDEX IF NOT EXISTS idx_invoices_project_id  ON public.maintenance_invoices (project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_resident_id ON public.maintenance_invoices (resident_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON public.maintenance_invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_month       ON public.maintenance_invoices (month);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date    ON public.maintenance_invoices (due_date);

CREATE TRIGGER trg_maintenance_invoices_updated_at
  BEFORE UPDATE ON public.maintenance_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 11: complaints — Colony complaint / ticket tracking
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.complaints (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  resident_id     uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  category        text NOT NULL
                    CHECK (category IN (
                      'plumbing','electrical','civil','road','water','security',
                      'cleanliness','street_light','sewage','garbage','lift',
                      'internet','common_area','other'
                    )),
  description     text NOT NULL,
  photo_url       text,
  attachments     jsonb NOT NULL DEFAULT '[]'::jsonb,
  priority        text NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','critical')),
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','resolved','closed','reopened')),
  assigned_to     text,
  resolution_notes text,
  sla_breached    boolean NOT NULL DEFAULT false,
  resolved_at     timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_complaints_project_id  ON public.complaints (project_id);
CREATE INDEX IF NOT EXISTS idx_complaints_resident_id ON public.complaints (resident_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status      ON public.complaints (status);
CREATE INDEX IF NOT EXISTS idx_complaints_category    ON public.complaints (category);
CREATE INDEX IF NOT EXISTS idx_complaints_priority    ON public.complaints (priority);

CREATE TRIGGER trg_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- TABLE 12: visitors — Gate-pass / visitor management log
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.visitors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  resident_id      uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  visitor_name     text NOT NULL,
  visitor_phone    text,
  purpose          text,
  vehicle_number   text,
  visitor_type     text NOT NULL DEFAULT 'guest'
                     CHECK (visitor_type IN ('guest','delivery','service','frequent','contractor','other')),
  photo_url        text,
  entry_time       timestamptz NOT NULL DEFAULT now(),
  exit_time        timestamptz,
  approval_status  text NOT NULL DEFAULT 'pending'
                     CHECK (approval_status IN ('pending','approved','denied','expired')),
  approved_by      text,
  approval_method  text
                     CHECK (approval_method IS NULL OR approval_method IN ('whatsapp','dashboard','phone_call','pre_approved')),
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitors_project_id     ON public.visitors (project_id);
CREATE INDEX IF NOT EXISTS idx_visitors_resident_id    ON public.visitors (resident_id);
CREATE INDEX IF NOT EXISTS idx_visitors_entry_time     ON public.visitors (entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_approval_status ON public.visitors (approval_status);

CREATE TRIGGER trg_visitors_updated_at
  BEFORE UPDATE ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =====================================================================
-- Helpful view: lead pipeline summary (dashboard KPIs)
-- =====================================================================
CREATE OR REPLACE VIEW public.v_lead_pipeline AS
SELECT
  l.builder_id,
  l.project_id,
  l.lead_stage,
  l.temperature,
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE l.created_at >= now() - interval '24 hours')::int AS last_24h,
  COUNT(*) FILTER (WHERE l.created_at >= now() - interval '7 days')::int  AS last_7d,
  COUNT(*) FILTER (WHERE l.created_at >= now() - interval '30 days')::int AS last_30d
FROM public.leads l
GROUP BY l.builder_id, l.project_id, l.lead_stage, l.temperature;


-- =====================================================================
-- END OF MIGRATION 001
-- =====================================================================
