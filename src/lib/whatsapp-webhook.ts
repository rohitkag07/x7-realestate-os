import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveLegacyBuilderId } from '@/lib/legacy-builder';
import { processAgentResponse } from '@/lib/sales-agent-engine';
import { createServiceClient } from '@/lib/supabase/server';

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: MetaWebhookValue;
    }>;
  }>;
};

type MetaWebhookValue = {
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    wa_id?: string;
    profile?: { name?: string };
  }>;
  messages?: MetaInboundMessage[];
  statuses?: MetaMessageStatus[];
};

type MetaInboundMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { payload?: string; text?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
  image?: { id?: string; caption?: string; mime_type?: string; sha256?: string };
  document?: { id?: string; caption?: string; filename?: string; mime_type?: string; sha256?: string };
  video?: { id?: string; caption?: string; mime_type?: string; sha256?: string };
  audio?: { id?: string; mime_type?: string; sha256?: string; voice?: boolean };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  context?: { from?: string; id?: string };
};

type MetaMessageStatus = {
  id?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
};

type MetaMessageError = NonNullable<MetaMessageStatus['errors']>[number];

type IngestResult = {
  duplicate: boolean;
  business_id: string;
  business_channel_id: string;
  contact_id: string;
  thread_id: string;
  playbook_id: string | null;
  message_id: string;
};

type StoredInbound = {
  businessId: string;
  businessChannelId: string;
  contactId: string;
  threadId: string;
  phone: string;
  message: string;
  buttonPayload: string | null;
};

export async function ingestWhatsAppWebhook(payload: MetaWebhookPayload) {
  if (payload.object && payload.object !== 'whatsapp_business_account') {
    return { messages: 0, statuses: 0, pendingResponses: [] as StoredInbound[] };
  }

  const supabase = createServiceClient();
  let messages = 0;
  let statuses = 0;
  const pendingResponses: StoredInbound[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field && change.field !== 'messages') continue;
      const value = change.value ?? {};
      statuses += await updateDeliveryStatuses(supabase, value.statuses ?? []);

      for (const message of value.messages ?? []) {
        const stored = await persistInboundMessage(supabase, value, message);
        if (stored) {
          messages += 1;
          pendingResponses.push(stored);
        }
      }
    }
  }

  return { messages, statuses, pendingResponses };
}

export async function processStoredWhatsAppMessages(contexts: StoredInbound[]) {
  const supabase = createServiceClient();
  for (const context of contexts) {
    try {
      await processAgentResponse(context, supabase);
    } catch (error) {
      console.error(
        'whatsapp_agent_response_failed',
        error instanceof Error ? error.message : error,
      );
    }
  }
}

async function persistInboundMessage(
  supabase: SupabaseClient<any>,
  value: MetaWebhookValue,
  message: MetaInboundMessage,
) {
  const providerMessageId = String(message.id || '').trim();
  const phoneNumberId = String(value.metadata?.phone_number_id || '').trim();
  const phone = normalizePhone(message.from);
  if (!providerMessageId || !phoneNumberId || !phone) {
    console.warn('whatsapp_webhook_invalid_message', {
      hasMessageId: Boolean(providerMessageId),
      hasPhoneNumberId: Boolean(phoneNumberId),
      hasPhone: Boolean(phone),
    });
    return false;
  }

  const contact = (value.contacts ?? []).find((candidate) =>
    normalizePhone(candidate.wa_id) === phone,
  );
  const body = extractBody(message);
  const buttonPayload = extractButtonPayload(message);
  const messageType = normalizeMessageType(message);
  const metadata = {
    phone_number_id: phoneNumberId,
    display_phone_number: value.metadata?.display_phone_number ?? null,
    timestamp: message.timestamp ?? null,
    context: message.context ?? null,
    interactive: message.interactive ?? null,
    button: message.button ?? null,
    media: extractMediaMetadata(message),
    location: message.location ?? null,
  };

  const result = await supabase.rpc('ingest_whatsapp_inbound', {
    p_phone_number_id: phoneNumberId,
    p_phone: phone,
    p_contact_name: contact?.profile?.name ?? null,
    p_provider_message_id: providerMessageId,
    p_message_type: messageType,
    p_body: body,
    p_metadata: metadata,
  });

  if (result.error) {
    throw new Error(`Canonical inbound ingest failed: ${result.error.message}`);
  }
  const ingest = result.data as IngestResult;
  if (ingest.duplicate) return false;

  const auditMessageId = await recordInboundAudit(supabase, ingest.business_id, {
    phone,
    providerMessageId,
    messageType,
    body,
    metadata,
  });
  if (auditMessageId) {
    await supabase
      .from('conversation_messages')
      .update({ whatsapp_message_id: auditMessageId })
      .eq('id', ingest.message_id)
      .eq('business_id', ingest.business_id);
  }

  await Promise.all([
    incrementMessagesIn(supabase, ingest.business_id),
    markBroadcastReply(supabase, phone),
  ]);

  return {
    businessId: ingest.business_id,
    businessChannelId: ingest.business_channel_id,
    contactId: ingest.contact_id,
    threadId: ingest.thread_id,
    phone,
    message: body,
    buttonPayload,
  };
}

async function updateDeliveryStatuses(
  supabase: SupabaseClient<any>,
  updates: MetaMessageStatus[],
) {
  let updated = 0;
  for (const event of updates) {
    const providerMessageId = String(event.id || '').trim();
    if (!providerMessageId || !event.status) continue;
    const error = event.errors?.[0];
    const errorText = error?.message || error?.title || null;

    await Promise.all([
      supabase
        .from('whatsapp_messages')
        .update({ status: event.status, error: errorText })
        .eq('wa_message_id', providerMessageId),
      supabase
        .from('conversation_messages')
        .update({ status: event.status })
        .eq('provider_msg_id', providerMessageId),
    ]);

    const recipient = await supabase
      .from('broadcast_recipients')
      .select('id, campaign_id')
      .eq('provider_message_id', providerMessageId)
      .maybeSingle();
    if (recipient.data) {
      const timestamp = metaTimestamp(event.timestamp);
      const update = broadcastStatusUpdate(event.status, timestamp, error);
      await supabase.from('broadcast_recipients').update(update).eq('id', recipient.data.id);
      await supabase.rpc('refresh_broadcast_campaign_metrics', {
        p_campaign_id: recipient.data.campaign_id,
      });
    }
    updated += 1;
  }
  return updated;
}

async function recordInboundAudit(
  supabase: SupabaseClient<any>,
  businessId: string,
  input: {
    phone: string;
    providerMessageId: string;
    messageType: string;
    body: string;
    metadata: Record<string, unknown>;
  },
) {
  const builderId = await resolveLegacyBuilderId(supabase, businessId);
  if (!builderId) return null;
  const result = await supabase
    .from('whatsapp_messages')
    .upsert({
      builder_id: builderId,
      direction: 'inbound',
      phone: input.phone,
      wa_message_id: input.providerMessageId,
      message_type: input.messageType,
      body: input.body || null,
      interactive_payload: input.metadata,
      status: 'received',
      agent: 'vercel-whatsapp-webhook',
      template_params: [{ business_id: businessId }],
    }, { onConflict: 'wa_message_id' })
    .select('id')
    .maybeSingle();
  if (result.error) {
    console.error('whatsapp_audit_insert_failed', result.error.message);
    return null;
  }
  return result.data?.id ?? null;
}

async function markBroadcastReply(supabase: SupabaseClient<any>, phone: string) {
  const recipient = await supabase
    .from('broadcast_recipients')
    .select('id, campaign_id')
    .eq('phone', phone)
    .not('sent_at', 'is', null)
    .is('replied_at', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!recipient.data) return;
  await supabase
    .from('broadcast_recipients')
    .update({ status: 'replied', replied_at: new Date().toISOString() })
    .eq('id', recipient.data.id);
  await supabase.rpc('refresh_broadcast_campaign_metrics', {
    p_campaign_id: recipient.data.campaign_id,
  });
}

async function incrementMessagesIn(supabase: SupabaseClient<any>, businessId: string) {
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from('business_usage')
    .upsert({ business_id: businessId, date: today }, {
      onConflict: 'business_id,date',
      ignoreDuplicates: true,
    });
  const current = await supabase
    .from('business_usage')
    .select('messages_in')
    .eq('business_id', businessId)
    .eq('date', today)
    .maybeSingle();
  if (!current.error) {
    await supabase
      .from('business_usage')
      .update({ messages_in: Number(current.data?.messages_in ?? 0) + 1 })
      .eq('business_id', businessId)
      .eq('date', today);
  }
}

function extractBody(message: MetaInboundMessage) {
  if (message.text?.body) return message.text.body.trim();
  if (message.button?.text) return message.button.text.trim();
  if (message.interactive?.button_reply?.title) return message.interactive.button_reply.title.trim();
  if (message.interactive?.list_reply?.title) return message.interactive.list_reply.title.trim();
  if (message.image?.caption) return message.image.caption.trim();
  if (message.document?.caption) return message.document.caption.trim();
  if (message.video?.caption) return message.video.caption.trim();
  if (message.location) {
    return [message.location.name, message.location.address].filter(Boolean).join(', ')
      || 'Location shared';
  }
  return '';
}

function extractButtonPayload(message: MetaInboundMessage) {
  return message.button?.payload
    || message.interactive?.button_reply?.id
    || message.interactive?.list_reply?.id
    || null;
}

function normalizeMessageType(message: MetaInboundMessage) {
  if (message.interactive?.button_reply) return 'button_reply';
  if (message.interactive?.list_reply) return 'list_reply';
  const type = message.type || 'text';
  return [
    'text', 'image', 'document', 'video', 'audio', 'interactive', 'location',
  ].includes(type) ? type : 'text';
}

function extractMediaMetadata(message: MetaInboundMessage) {
  if (message.image) return { type: 'image', ...message.image };
  if (message.document) return { type: 'document', ...message.document };
  if (message.video) return { type: 'video', ...message.video };
  if (message.audio) return { type: 'audio', ...message.audio };
  return null;
}

function normalizePhone(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

function metaTimestamp(value: string | undefined) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : new Date().toISOString();
}

function broadcastStatusUpdate(
  status: MetaMessageStatus['status'],
  timestamp: string,
  error?: MetaMessageError,
) {
  if (status === 'delivered') return { status, delivered_at: timestamp };
  if (status === 'read') return { status, delivered_at: timestamp, read_at: timestamp };
  if (status === 'failed') {
    return {
      status,
      failed_at: timestamp,
      error_code: error?.code ? String(error.code) : null,
      error_message: error?.message || error?.title || 'Meta delivery failed',
    };
  }
  return { status: 'sent', sent_at: timestamp };
}
