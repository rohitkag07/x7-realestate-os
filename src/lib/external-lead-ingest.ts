import 'server-only';

import { callSalesAgent, serviceClientOrNull } from '@/lib/sales-server';

export type ExternalLeadSource = 'justdial' | 'indiamart';

export async function ingestExternalLead(input: {
  source: ExternalLeadSource;
  name?: string | null;
  phone: string;
  message?: string | null;
  city?: string | null;
  category?: string | null;
  raw: Record<string, unknown>;
}) {
  const supabase = serviceClientOrNull();
  const businessId = process.env.DEFAULT_BUSINESS_ID || process.env.DEFAULT_BUILDER_ID;
  if (!supabase || !businessId) throw new Error('external_lead_ingest_not_configured');
  const phone = normalizePhone(input.phone);
  if (phone.length < 10) throw new Error('valid_phone_required');

  const { data: contact, error: contactError } = await (supabase.from('conversation_contacts') as any).upsert({
    business_id: businessId,
    phone,
    name: input.name?.trim() || null,
    source: input.source,
    stage: 'new',
    lifecycle_stage: 'lead',
    metadata: { external_source: input.source, city: input.city ?? null, category: input.category ?? null, raw: input.raw },
    last_message_at: new Date().toISOString(),
  }, { onConflict: 'business_id,phone' }).select().single();
  if (contactError || !contact) throw new Error(contactError?.message || 'contact_write_failed');

  const { data: existingThread } = await (supabase.from('conversation_threads') as any)
    .select('*').eq('business_id', businessId).eq('contact_id', contact.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  const threadWrite = existingThread
    ? await (supabase.from('conversation_threads') as any).update({ last_message_at: new Date().toISOString(), stage: 'new', metadata: { ...(existingThread.metadata || {}), external_source: input.source } }).eq('id', existingThread.id).select().single()
    : await (supabase.from('conversation_threads') as any).insert({ business_id: businessId, contact_id: contact.id, channel: 'whatsapp', status: 'open', ai_mode: 'assistant', stage: 'new', metadata: { external_source: input.source } }).select().single();
  if (threadWrite.error || !threadWrite.data) throw new Error(threadWrite.error?.message || 'thread_write_failed');
  const thread = threadWrite.data;
  const body = input.message?.trim() || `New ${input.source} inquiry from ${contact.name || phone}.`;

  await (supabase.from('conversation_messages') as any).insert({
    business_id: businessId, thread_id: thread.id, contact_id: contact.id,
    direction: 'inbound', channel: 'whatsapp', message_type: 'text', body,
    status: 'received', agent: `${input.source}-ingest`, metadata: { external_source: input.source },
  });
  const { data: playbook } = await (supabase.from('assistant_playbooks') as any).select('id').eq('business_id', businessId).eq('is_active', true).limit(1).maybeSingle();
  const response = playbook ? await callSalesAgent('/playbook/respond', { business_id: businessId, playbook_id: playbook.id, thread_id: thread.id, contact_id: contact.id, phone, message: body, send_via_whatsapp: true }) : null;
  return { contact, thread, response };
}

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  return value.startsWith('+') ? value : `+${digits}`;
}
