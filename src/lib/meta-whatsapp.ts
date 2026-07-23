import type { SupabaseClient } from '@supabase/supabase-js';
import type { CreateTemplateInput } from '@/lib/broadcast-schema';

type MetaTemplate = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: Array<Record<string, unknown>>;
  quality_score?: { score?: string } | string;
  rejected_reason?: string;
};

export async function resolveWhatsAppChannel(supabase: SupabaseClient<any>, businessId: string) {
  const primary = await supabase
    .from('business_channels')
    .select('*')
    .eq('business_id', businessId)
    .eq('channel_type', 'whatsapp')
    .eq('is_primary', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (primary.error) throw new Error(primary.error.message);

  const fallback = primary.data ? null : await supabase
    .from('business_channels')
    .select('*')
    .eq('business_id', businessId)
    .eq('channel_type', 'whatsapp')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fallback?.error) throw new Error(fallback.error.message);
  const data = primary.data || fallback?.data;
  if (!data) throw new Error('WhatsApp channel is not configured.');

  const businessAccountId = data.business_account_id
    || data.metadata?.business_account_id
    || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
    || process.env.WHATSAPP_WABA_ID;
  if (!businessAccountId) throw new Error('WhatsApp Business Account ID is missing.');

  return { ...data, business_account_id: businessAccountId };
}

export async function fetchMetaTemplates(businessAccountId: string) {
  const templates: MetaTemplate[] = [];
  let url: string | null = graphUrl(`${businessAccountId}/message_templates`, {
    fields: 'id,name,language,category,status,components,quality_score,rejected_reason',
    limit: '100',
  });

  while (url) {
    const response = await metaFetch(url);
    templates.push(...((response.data ?? []) as MetaTemplate[]));
    url = typeof response.paging?.next === 'string' ? response.paging.next : null;
  }
  return templates;
}

export async function createMetaTemplate(businessAccountId: string, input: CreateTemplateInput) {
  return metaFetch(graphUrl(`${businessAccountId}/message_templates`), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function normalizeMetaTemplateStatus(value: unknown) {
  const normalized = String(value || 'PENDING').toUpperCase();
  return ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED'].includes(normalized)
    ? normalized
    : 'PENDING';
}

export function qualityScoreValue(value: MetaTemplate['quality_score']) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.score ?? null;
}

function graphUrl(path: string, query?: Record<string, string>) {
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function metaFetch(url: string, init?: RequestInit) {
  const token = process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token) throw new Error('META_ACCESS_TOKEN or WHATSAPP_ACCESS_TOKEN is missing.');

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `Meta Graph request failed (${response.status}).`;
    throw new Error(message);
  }
  return body;
}
