-- =====================================================================
-- WhatsAI Assistant — Colony Management (Phase 5)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.colony_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  monthly_rate integer NOT NULL DEFAULT 2500 CHECK (monthly_rate >= 0),
  rate_per_sqft numeric(8,3), rate_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  billing_day integer NOT NULL DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
  due_grace_days integer NOT NULL DEFAULT 10,
  late_fee_amount integer NOT NULL DEFAULT 100, late_fee_after_days integer NOT NULL DEFAULT 25,
  upi_vpa text, upi_name text, bank_account_name text, bank_account_no text, bank_ifsc text,
  gst_number text, gst_rate numeric(4,2) NOT NULL DEFAULT 0.0, pan_number text,
  invoice_prefix text NOT NULL DEFAULT 'INV', receipt_prefix text NOT NULL DEFAULT 'RCP',
  next_invoice_seq integer NOT NULL DEFAULT 1, next_receipt_seq integer NOT NULL DEFAULT 1,
  reminder_day_1 integer NOT NULL DEFAULT 10, reminder_day_2 integer NOT NULL DEFAULT 20, reminder_day_3 integer NOT NULL DEFAULT 25,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_colony_settings_updated_at BEFORE UPDATE ON public.colony_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  title text NOT NULL, body text NOT NULL, body_hindi text,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','maintenance','emergency','event','poll','payment','warning')),
  target text NOT NULL DEFAULT 'all' CHECK (target IN ('all','owners','tenants','block','floor','custom')),
  target_filter jsonb NOT NULL DEFAULT '{}'::jsonb, attachment_url text,
  scheduled_for timestamptz, sent_at timestamptz,
  recipient_count integer NOT NULL DEFAULT 0, delivered_count integer NOT NULL DEFAULT 0, read_count integer NOT NULL DEFAULT 0,
  poll_options jsonb NOT NULL DEFAULT '[]'::jsonb, poll_responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  created_by text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notices_project ON public.notices (project_id);
CREATE INDEX IF NOT EXISTS idx_notices_status ON public.notices (status);
CREATE TRIGGER trg_notices_updated_at BEFORE UPDATE ON public.notices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL, kind text NOT NULL CHECK (kind IN ('clubhouse','party_hall','court','pool','gym','guest_room','parking','other')),
  capacity integer, hourly_rate integer NOT NULL DEFAULT 0, daily_rate integer,
  open_time text NOT NULL DEFAULT '06:00', close_time text NOT NULL DEFAULT '22:00', rules text,
  enabled boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);
CREATE TRIGGER trg_amenities_updated_at BEFORE UPDATE ON public.amenities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.amenity_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_id uuid NOT NULL REFERENCES public.amenities(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  booking_date date NOT NULL, start_time text NOT NULL, end_time text NOT NULL,
  guests integer NOT NULL DEFAULT 1, fee integer NOT NULL DEFAULT 0, paid boolean NOT NULL DEFAULT false,
  upi_payment_link text, status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_amenity ON public.amenity_bookings (amenity_id);
CREATE INDEX IF NOT EXISTS idx_amenity_bookings_date ON public.amenity_bookings (booking_date);
CREATE TRIGGER trg_amenity_bookings_updated_at BEFORE UPDATE ON public.amenity_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.colony_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL, phone text NOT NULL,
  role text NOT NULL CHECK (role IN ('guard','plumber','electrician','cleaner','gardener','lift_operator','supervisor','manager','other')),
  shift text, vendor_company text, monthly_salary integer, joined_at date,
  active boolean NOT NULL DEFAULT true, performance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_project ON public.colony_staff (project_id);
CREATE INDEX IF NOT EXISTS idx_staff_role ON public.colony_staff (role);
CREATE TRIGGER trg_colony_staff_updated_at BEFORE UPDATE ON public.colony_staff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.complaint_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  update_type text NOT NULL CHECK (update_type IN ('comment','assignment','status_change','reminder','photo','closed')),
  body text, from_role text, from_name text, attachment_url text,
  visible_to_resident boolean NOT NULL DEFAULT true, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_complaint_updates_complaint ON public.complaint_updates (complaint_id);

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES public.residents(id) ON DELETE CASCADE,
  plot_id uuid REFERENCES public.plots(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('society_bylaws','registration','rera','fire_noc','lift_certificate','agm_minutes','sale_deed','noc','rent_agreement','utility_bill','other')),
  title text NOT NULL, file_url text NOT NULL, size_bytes integer, uploaded_by text,
  visible_to_residents boolean NOT NULL DEFAULT false, expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents (project_id);
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.maintenance_invoices(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE, amount integer NOT NULL CHECK (amount >= 0),
  payment_mode text NOT NULL CHECK (payment_mode IN ('upi','neft','imps','rtgs','cash','cheque','card')),
  payment_reference text, pdf_url text, issued_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice ON public.payment_receipts (invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_resident ON public.payment_receipts (resident_id);

ALTER TABLE public.colony_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenity_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colony_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS colony_settings_tenant ON public.colony_settings;
CREATE POLICY colony_settings_tenant ON public.colony_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = colony_settings.project_id AND p.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = colony_settings.project_id AND p.builder_id = public.auth_builder_id()));
DROP POLICY IF EXISTS notices_tenant ON public.notices;
CREATE POLICY notices_tenant ON public.notices FOR ALL TO authenticated USING (builder_id = public.auth_builder_id()) WITH CHECK (builder_id = public.auth_builder_id());
DROP POLICY IF EXISTS amenities_tenant ON public.amenities;
CREATE POLICY amenities_tenant ON public.amenities FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = amenities.project_id AND p.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = amenities.project_id AND p.builder_id = public.auth_builder_id()));
DROP POLICY IF EXISTS amenity_bookings_tenant ON public.amenity_bookings;
CREATE POLICY amenity_bookings_tenant ON public.amenity_bookings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = amenity_bookings.project_id AND p.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = amenity_bookings.project_id AND p.builder_id = public.auth_builder_id()));
DROP POLICY IF EXISTS colony_staff_tenant ON public.colony_staff;
CREATE POLICY colony_staff_tenant ON public.colony_staff FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = colony_staff.project_id AND p.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = colony_staff.project_id AND p.builder_id = public.auth_builder_id()));
DROP POLICY IF EXISTS complaint_updates_tenant ON public.complaint_updates;
CREATE POLICY complaint_updates_tenant ON public.complaint_updates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.complaints c JOIN public.projects p ON p.id = c.project_id WHERE c.id = complaint_updates.complaint_id AND p.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.complaints c JOIN public.projects p ON p.id = c.project_id WHERE c.id = complaint_updates.complaint_id AND p.builder_id = public.auth_builder_id()));
DROP POLICY IF EXISTS documents_tenant ON public.documents;
CREATE POLICY documents_tenant ON public.documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = documents.project_id AND p.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = documents.project_id AND p.builder_id = public.auth_builder_id()));
DROP POLICY IF EXISTS receipts_tenant ON public.payment_receipts;
CREATE POLICY receipts_tenant ON public.payment_receipts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = payment_receipts.project_id AND p.builder_id = public.auth_builder_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = payment_receipts.project_id AND p.builder_id = public.auth_builder_id()));

CREATE OR REPLACE VIEW public.v_defaulters AS
SELECT inv.project_id, inv.resident_id, r.name AS resident_name, r.phone AS resident_phone,
  SUM(inv.amount + inv.late_fee)::int AS total_due, COUNT(*)::int AS overdue_months,
  MAX(current_date - inv.due_date)::int AS days_overdue, ARRAY_AGG(inv.month ORDER BY inv.month DESC) AS months_pending
FROM public.maintenance_invoices inv JOIN public.residents r ON r.id = inv.resident_id
WHERE inv.status IN ('pending','overdue') AND inv.due_date < current_date
GROUP BY inv.project_id, inv.resident_id, r.name, r.phone;

CREATE OR REPLACE VIEW public.v_ticket_sla AS
SELECT c.id, c.project_id, c.category, c.priority, c.status,
  EXTRACT(epoch FROM (now() - c.created_at)) / 3600 AS hours_open,
  CASE WHEN c.status IN ('open','in_progress','reopened') AND EXTRACT(epoch FROM (now() - c.created_at)) / 3600 >
    CASE c.priority WHEN 'critical' THEN 4 WHEN 'high' THEN 24 WHEN 'medium' THEN 48 WHEN 'low' THEN 96 END
  THEN true ELSE false END AS sla_breached
FROM public.complaints c;

CREATE OR REPLACE VIEW public.v_monthly_collection AS
SELECT inv.project_id, inv.month, SUM(inv.amount) AS billed,
  SUM(inv.amount) FILTER (WHERE inv.status = 'paid') AS collected,
  SUM(inv.amount) FILTER (WHERE inv.status IN ('pending','overdue')) AS pending,
  COUNT(*) AS total_invoices, COUNT(*) FILTER (WHERE inv.status = 'paid') AS paid_invoices,
  ROUND((COUNT(*) FILTER (WHERE inv.status = 'paid')::numeric / NULLIF(COUNT(*), 0)) * 100, 1) AS collection_rate_pct
FROM public.maintenance_invoices inv GROUP BY inv.project_id, inv.month;
