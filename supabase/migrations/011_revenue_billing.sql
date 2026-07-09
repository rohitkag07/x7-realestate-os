-- =====================================================================
-- X7 WhatsAI Assistant — Revenue & Billing Schema (Phase 5)
-- =====================================================================
-- Adds subscription plans, invoices, usage tracking, and white-label
-- setup checklist on top of the existing trial_accounts table.
-- =====================================================================

-- 1. Subscription plans catalogue
CREATE TABLE public.subscription_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,           -- 'trial' | 'basic' | 'growth' | 'pro'
  name        TEXT NOT NULL,
  price_inr   INTEGER NOT NULL DEFAULT 0,    -- monthly price in INR (0 = free trial)
  setup_fee_inr INTEGER NOT NULL DEFAULT 0,
  features    JSONB NOT NULL DEFAULT '[]',    -- array of feature strings
  limits      JSONB NOT NULL DEFAULT '{}',    -- { messages_per_day, contacts, verticals }
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the four plans defined in the pivot strategy
INSERT INTO public.subscription_plans (key, name, price_inr, setup_fee_inr, features, limits, sort_order) VALUES
  ('trial',  'Trial',        0,     0,     '["7-day WhatsApp AI receptionist","1 vertical playbook","Daily hot-lead summary","Operator dashboard"]',
                                            '{"messages_per_day":500,"contacts":100,"verticals":1}', 0),
  ('basic',  'Basic',        2999,  5000,  '["WhatsApp receptionist 24/7","1 vertical playbook","Lead qualification","Follow-up queue","Daily summary","Dashboard access"]',
                                            '{"messages_per_day":150,"contacts":500,"verticals":1}', 1),
  ('growth', 'Growth',       7999,  10000, '["Everything in Basic","2 vertical playbooks","Handoff SLA alerts","Appointment booking","CSV export","Priority support"]',
                                            '{"messages_per_day":500,"contacts":2000,"verticals":2}', 2),
  ('pro',    'Pro',          14999, 25000, '["Everything in Growth","5 vertical playbooks","Custom playbook editor","White-label dashboard","Dedicated onboarding","SLA guarantee"]',
                                            '{"messages_per_day":2000,"contacts":10000,"verticals":5}', 3);

-- 2. Business subscriptions (one active row per business)
CREATE TABLE public.business_subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan_id          UUID NOT NULL REFERENCES public.subscription_plans(id),
  status           TEXT NOT NULL DEFAULT 'trialing'  -- trialing | active | past_due | cancelled | expired
                     CHECK (status IN ('trialing','active','past_due','cancelled','expired')),
  razorpay_sub_id  TEXT,                              -- Razorpay subscription ID
  razorpay_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  trial_end        TIMESTAMPTZ,
  cancel_at        TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  upgrade_prompted_at TIMESTAMPTZ,                   -- last time we showed upgrade prompt
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

CREATE TRIGGER set_updated_at_business_subscriptions
  BEFORE UPDATE ON public.business_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Invoices / payments
CREATE TABLE public.subscription_invoices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  subscription_id  UUID REFERENCES public.business_subscriptions(id),
  razorpay_payment_id  TEXT,
  razorpay_order_id    TEXT,
  amount_inr       INTEGER NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'INR',
  status           TEXT NOT NULL DEFAULT 'created'   -- created | paid | failed | refunded
                     CHECK (status IN ('created','paid','failed','refunded')),
  invoice_type     TEXT NOT NULL DEFAULT 'subscription' -- subscription | setup_fee | addon
                     CHECK (invoice_type IN ('subscription','setup_fee','addon')),
  description      TEXT,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Usage tracking (daily rollup per business)
CREATE TABLE public.business_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_in     INTEGER NOT NULL DEFAULT 0,
  messages_out    INTEGER NOT NULL DEFAULT 0,
  contacts_active INTEGER NOT NULL DEFAULT 0,
  handoffs        INTEGER NOT NULL DEFAULT 0,
  qual_answers    INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, date)
);

CREATE TRIGGER set_updated_at_business_usage
  BEFORE UPDATE ON public.business_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. White-label setup checklist
CREATE TABLE public.business_setup_checklist (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  step_key     TEXT NOT NULL,       -- e.g. 'whatsapp_connected', 'playbook_set', 'owner_number_set'
  step_label   TEXT NOT NULL,
  is_done      BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, step_key)
);

-- Seed default checklist steps for every new business via a function
CREATE OR REPLACE FUNCTION public.seed_setup_checklist(p_business_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.business_setup_checklist (business_id, step_key, step_label) VALUES
    (p_business_id, 'business_profile',     'Complete business profile (name, phone, city)'),
    (p_business_id, 'whatsapp_channel',     'Connect WhatsApp Business number'),
    (p_business_id, 'playbook_selected',    'Select or create an assistant playbook'),
    (p_business_id, 'owner_handoff_number', 'Set owner WhatsApp number for handoffs'),
    (p_business_id, 'test_message_sent',    'Send a test WhatsApp message'),
    (p_business_id, 'daily_summary_on',     'Enable daily hot-lead summary'),
    (p_business_id, 'first_lead_captured',  'Capture first real lead'),
    (p_business_id, 'trial_reviewed',       'Review 7-day trial results with team')
  ON CONFLICT (business_id, step_key) DO NOTHING;
END;
$$;

-- 6. RLS for new tables
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_plans_public ON public.subscription_plans FOR SELECT TO authenticated USING (true);

ALTER TABLE public.business_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_subscriptions_tenant ON public.business_subscriptions FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_invoices_tenant ON public.subscription_invoices FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

ALTER TABLE public.business_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_usage_tenant ON public.business_usage FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

ALTER TABLE public.business_setup_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_setup_checklist_tenant ON public.business_setup_checklist FOR ALL TO authenticated
  USING      (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());
