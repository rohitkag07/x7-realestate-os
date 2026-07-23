-- =====================================================================
-- WhatsAI Assistant - WhatsApp templates, broadcasts, and interactions
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  business_channel_id uuid REFERENCES public.business_channels(id) ON DELETE SET NULL,
  name text NOT NULL,
  language text NOT NULL DEFAULT 'en_US',
  category text NOT NULL DEFAULT 'UTILITY',
  status text NOT NULL DEFAULT 'PENDING',
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta_template_id text,
  quality_score text,
  rejection_reason text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_templates_category_check
    CHECK (category IN ('MARKETING', 'UTILITY')),
  CONSTRAINT whatsapp_templates_status_check
    CHECK (status IN ('APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED')),
  CONSTRAINT whatsapp_templates_components_array
    CHECK (jsonb_typeof(components) = 'array'),
  UNIQUE (business_id, name, language)
);

CREATE INDEX IF NOT EXISTS whatsapp_templates_business_status_idx
  ON public.whatsapp_templates (business_id, status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_templates_meta_id_uidx
  ON public.whatsapp_templates (business_id, meta_template_id)
  WHERE meta_template_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.whatsapp_templates(id) ON DELETE RESTRICT,
  name text NOT NULL,
  audience_type text NOT NULL DEFAULT 'all_contacts',
  audience_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  variable_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0 CHECK (total_recipients >= 0),
  sent_count integer NOT NULL DEFAULT 0 CHECK (sent_count >= 0),
  delivered_count integer NOT NULL DEFAULT 0 CHECK (delivered_count >= 0),
  read_count integer NOT NULL DEFAULT 0 CHECK (read_count >= 0),
  replied_count integer NOT NULL DEFAULT 0 CHECK (replied_count >= 0),
  failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_campaigns_audience_type_check
    CHECK (audience_type IN ('all_contacts', 'stage', 'category', 'selected_contacts')),
  CONSTRAINT broadcast_campaigns_status_check
    CHECK (status IN ('draft', 'scheduled', 'queued', 'processing', 'paused', 'completed', 'cancelled', 'failed'))
);

CREATE INDEX IF NOT EXISTS broadcast_campaigns_business_status_idx
  ON public.broadcast_campaigns (business_id, status, COALESCE(scheduled_at, created_at));

CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.broadcast_campaigns(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.conversation_contacts(id) ON DELETE SET NULL,
  phone text NOT NULL,
  contact_name text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  worker_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz,
  failed_at timestamptz,
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcast_recipients_status_check
    CHECK (status IN ('queued', 'processing', 'sent', 'delivered', 'read', 'replied', 'failed', 'skipped')),
  UNIQUE (campaign_id, phone)
);

CREATE INDEX IF NOT EXISTS broadcast_recipients_claim_idx
  ON public.broadcast_recipients (campaign_id, status, next_attempt_at, created_at)
  WHERE status IN ('queued', 'failed');

CREATE INDEX IF NOT EXISTS broadcast_recipients_business_idx
  ON public.broadcast_recipients (business_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS broadcast_recipients_provider_message_uidx
  ON public.broadcast_recipients (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.assistant_knowledge_items
  ADD COLUMN IF NOT EXISTS interactive_buttons jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.assistant_knowledge_items
  DROP CONSTRAINT IF EXISTS assistant_knowledge_items_interactive_buttons_array;

ALTER TABLE public.assistant_knowledge_items
  ADD CONSTRAINT assistant_knowledge_items_interactive_buttons_array
  CHECK (jsonb_typeof(interactive_buttons) = 'array' AND jsonb_array_length(interactive_buttons) <= 3);

CREATE OR REPLACE FUNCTION public.whatsai_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS whatsapp_templates_touch_updated_at ON public.whatsapp_templates;
CREATE TRIGGER whatsapp_templates_touch_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.whatsai_touch_updated_at();

DROP TRIGGER IF EXISTS broadcast_campaigns_touch_updated_at ON public.broadcast_campaigns;
CREATE TRIGGER broadcast_campaigns_touch_updated_at
  BEFORE UPDATE ON public.broadcast_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.whatsai_touch_updated_at();

DROP TRIGGER IF EXISTS broadcast_recipients_touch_updated_at ON public.broadcast_recipients;
CREATE TRIGGER broadcast_recipients_touch_updated_at
  BEFORE UPDATE ON public.broadcast_recipients
  FOR EACH ROW EXECUTE FUNCTION public.whatsai_touch_updated_at();

-- Atomically claim a batch so overlapping schedulers cannot send duplicates.
CREATE OR REPLACE FUNCTION public.claim_broadcast_recipients(
  p_campaign_id uuid,
  p_limit integer DEFAULT 20,
  p_worker_id text DEFAULT 'sales-agent'
)
RETURNS SETOF public.broadcast_recipients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT recipient.id
    FROM public.broadcast_recipients AS recipient
    JOIN public.broadcast_campaigns AS campaign
      ON campaign.id = recipient.campaign_id
     AND campaign.business_id = recipient.business_id
    WHERE recipient.campaign_id = p_campaign_id
      AND recipient.status IN ('queued', 'failed')
      AND recipient.next_attempt_at <= now()
      AND recipient.attempts < 3
      AND campaign.status IN ('queued', 'processing')
    ORDER BY recipient.created_at, recipient.id
    FOR UPDATE OF recipient SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 20)
  )
  UPDATE public.broadcast_recipients AS recipient
  SET
    status = 'processing',
    claimed_at = now(),
    worker_id = p_worker_id,
    attempts = recipient.attempts + 1,
    error_code = NULL,
    error_message = NULL
  FROM candidates
  WHERE recipient.id = candidates.id
  RETURNING recipient.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_broadcast_recipients(uuid, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_broadcast_recipients(uuid, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_broadcast_campaign_metrics(p_campaign_id uuid)
RETURNS public.broadcast_campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_campaign public.broadcast_campaigns;
BEGIN
  UPDATE public.broadcast_campaigns AS campaign
  SET
    total_recipients = metrics.total_recipients,
    sent_count = metrics.sent_count,
    delivered_count = metrics.delivered_count,
    read_count = metrics.read_count,
    replied_count = metrics.replied_count,
    failed_count = metrics.failed_count
  FROM (
    SELECT
      count(*)::integer AS total_recipients,
      count(*) FILTER (WHERE sent_at IS NOT NULL)::integer AS sent_count,
      count(*) FILTER (WHERE delivered_at IS NOT NULL)::integer AS delivered_count,
      count(*) FILTER (WHERE read_at IS NOT NULL)::integer AS read_count,
      count(*) FILTER (WHERE replied_at IS NOT NULL)::integer AS replied_count,
      count(*) FILTER (WHERE status = 'failed')::integer AS failed_count
    FROM public.broadcast_recipients
    WHERE campaign_id = p_campaign_id
  ) AS metrics
  WHERE campaign.id = p_campaign_id
  RETURNING campaign.* INTO updated_campaign;

  RETURN updated_campaign;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_broadcast_campaign_metrics(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_broadcast_campaign_metrics(uuid) TO service_role;

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_templates_tenant ON public.whatsapp_templates;
CREATE POLICY whatsapp_templates_tenant
  ON public.whatsapp_templates FOR ALL TO authenticated
  USING (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

DROP POLICY IF EXISTS broadcast_campaigns_tenant ON public.broadcast_campaigns;
CREATE POLICY broadcast_campaigns_tenant
  ON public.broadcast_campaigns FOR ALL TO authenticated
  USING (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

DROP POLICY IF EXISTS broadcast_recipients_tenant ON public.broadcast_recipients;
CREATE POLICY broadcast_recipients_tenant
  ON public.broadcast_recipients FOR ALL TO authenticated
  USING (business_id = public.auth_builder_id())
  WITH CHECK (business_id = public.auth_builder_id());

COMMENT ON TABLE public.whatsapp_templates IS
  'Tenant-scoped local mirror of Meta WhatsApp message templates.';

COMMENT ON TABLE public.broadcast_campaigns IS
  'WhatsApp template broadcast definitions and aggregate delivery metrics.';

COMMENT ON TABLE public.broadcast_recipients IS
  'Per-contact broadcast queue and message lifecycle used by the rate-limited worker.';
