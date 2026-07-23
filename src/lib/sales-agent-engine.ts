import type { SupabaseClient } from '@supabase/supabase-js';
import { findKeywordReply, normalizeMessage, type KeywordMatch } from '@/lib/deterministic-keyword-engine';
import { resolveLegacyBuilderId } from '@/lib/legacy-builder';
import { createServiceClient } from '@/lib/supabase/server';
import {
  sendWhatsAppCloudMessage,
  type WhatsAppMedia,
  type WhatsAppQuickReplyButton,
  type WhatsAppSendResult,
} from '@/lib/whatsapp-cloud-api';
import type {
  AssistantKnowledgeItem,
  AssistantPlaybook,
  BusinessChannel,
  KeywordReplyRule,
} from '@/types/database';

type AgentContext = {
  businessId: string;
  businessChannelId: string;
  contactId: string;
  threadId: string;
  phone: string;
  message: string;
  buttonPayload?: string | null;
};

type KnowledgeMatch = {
  item: AssistantKnowledgeItem;
  match: KeywordMatch;
};

type RuleMedia = WhatsAppMedia & {
  assetId?: string;
};

export type AgentResponseResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  handoff?: boolean;
  reply?: string;
  outbound?: WhatsAppSendResult;
  matchedRuleId?: string | null;
  matchedKnowledgeId?: string | null;
};

const handoffTriggers: Record<string, string[]> = {
  real_estate: ['legal advice', 'pricing negotiation above budget'],
  clinic: ['emergency', 'diagnosis', 'prescription', 'chest pain', 'unconscious'],
  coaching: ['refund request', 'complaints about faculty'],
  gym: ['medical condition', 'serious injury', 'eating disorder'],
  local_service: ['emergency service', 'gas leak', 'electrical hazard'],
  other: [],
};

export async function processAgentResponse(
  context: AgentContext,
  suppliedClient?: SupabaseClient<any>,
): Promise<AgentResponseResult> {
  if (process.env.DYNAMIC_KEYWORD_ENGINE_ENABLED === 'false') {
    return { ok: false, skipped: true, reason: 'dynamic_keyword_engine_disabled' };
  }

  const supabase = suppliedClient ?? createServiceClient();
  const thread = await loadThread(supabase, context);
  if (!thread) return { ok: false, skipped: true, reason: 'thread_not_found_for_business' };
  if (thread.ai_mode === 'manual' || ['bot_paused', 'human_takeover'].includes(thread.status)) {
    return { ok: true, skipped: true, reason: 'human_takeover_active' };
  }

  const [playbook, channel] = await Promise.all([
    loadPlaybook(supabase, context.businessId, thread.playbook_id),
    loadChannel(supabase, context.businessId, context.businessChannelId),
  ]);
  if (!playbook) {
    await createHandoff(supabase, context, 'active_playbook_not_found', 'high', context.message);
    return { ok: false, handoff: true, reason: 'active_playbook_not_found' };
  }
  if (!channel?.phone_number_id && !channel?.channel_id) {
    await createHandoff(supabase, context, 'whatsapp_channel_not_configured', 'high', context.message);
    return { ok: false, handoff: true, reason: 'whatsapp_channel_not_configured' };
  }

  const forcedHandoff = mandatoryHandoffReason(context.message, playbook.vertical);
  const keywordMatch = forcedHandoff
    ? null
    : findKeywordReply(context.message, playbook.keyword_replies, context.buttonPayload);
  const knowledgeMatch = !forcedHandoff && !keywordMatch && process.env.KNOWLEDGE_BASE_ENABLED !== 'false'
    ? await findKnowledgeMatch(supabase, context.businessId, playbook.id, context.message)
    : null;

  const unmatched = !forcedHandoff && !keywordMatch && !knowledgeMatch;
  const handoff = Boolean(forcedHandoff || unmatched || keywordMatch?.rule.handoff);
  const handoffReason = forcedHandoff
    || (unmatched ? 'knowledge_no_match' : keywordMatch?.rule.handoff ? 'keyword_handoff' : null);
  const reply = forcedHandoff
    ? mandatoryHandoffReply(playbook.vertical)
    : keywordMatch?.rule.reply
      || knowledgeMatch?.item.content
      || playbook.fallback_reply
      || 'Thank you. A team member will reply shortly.';
  const buttons = normalizeButtons(
    keywordMatch?.rule.interactive_buttons
    || knowledgeMatch?.item.interactive_buttons
    || [],
  );
  const media = keywordMatch
    ? await resolveRuleMedia(supabase, context.businessId, playbook.id, keywordMatch.rule)
    : resolveKnowledgeMedia(knowledgeMatch?.item ?? null);

  const firstAutomatedReply = await isFirstAutomatedReply(supabase, context.threadId);
  const metadata = {
    response_type: handoff ? 'handoff' : 'answer',
    engine: knowledgeMatch ? 'deterministic_knowledge_v1' : 'deterministic_keyword_v1',
    business_id: context.businessId,
    playbook_id: playbook.id,
    playbook_version: playbook.playbook_version,
    rule_id: keywordMatch?.rule.id ?? null,
    matched_keyword: keywordMatch?.keyword ?? null,
    match_type: keywordMatch?.rule.match_type ?? null,
    match_mode: keywordMatch?.matchMode ?? knowledgeMatch?.match.matchMode ?? null,
    match_confidence: keywordMatch?.confidence ?? knowledgeMatch?.match.confidence ?? null,
    knowledge_item_id: knowledgeMatch?.item.id ?? null,
    handoff_reason: handoffReason,
    interactive_buttons: buttons,
    media_asset_id: media?.assetId ?? null,
  };

  const accessToken = channelAccessToken(channel);
  let outbound = await sendWhatsAppCloudMessage({
    to: context.phone,
    phoneNumberId: channel.phone_number_id || channel.channel_id,
    accessToken,
    message: buttons.length
      ? { type: 'buttons', body: reply, buttons, media }
      : media
        ? { type: 'media', media: { ...media, caption: reply } }
        : { type: 'text', body: reply },
  });

  if (!outbound.ok && media) {
    await createHandoff(
      supabase,
      context,
      'media_delivery_failed',
      'high',
      `Attachment delivery failed: ${outbound.error || 'Meta API error'}`,
    );
    outbound = await sendWhatsAppCloudMessage({
      to: context.phone,
      phoneNumberId: channel.phone_number_id || channel.channel_id,
      accessToken,
      message: { type: 'text', body: reply },
    });
  }

  const auditMessageId = await recordAuditOutbound(
    supabase,
    context,
    reply,
    buttons.length ? 'interactive' : media?.type || 'text',
    outbound,
  );
  await recordCanonicalOutbound(
    supabase,
    context,
    reply,
    buttons.length ? 'interactive' : media?.type || 'text',
    media?.url ?? null,
    outbound,
    auditMessageId,
    metadata,
  );
  await incrementUsage(supabase, context.businessId, 'messages_out');

  if (outbound.ok && firstAutomatedReply) {
    await enqueueFirstFollowup(supabase, context, playbook.id);
  }
  if (handoff && handoffReason) {
    await createHandoff(
      supabase,
      context,
      handoffReason,
      forcedHandoff ? 'critical' : 'high',
      context.message,
    );
  }
  if (!outbound.ok) {
    await createHandoff(
      supabase,
      context,
      'whatsapp_delivery_failed',
      'high',
      outbound.error || 'Meta Cloud API delivery failed.',
    );
  }

  return {
    ok: outbound.ok,
    handoff,
    reply,
    outbound,
    matchedRuleId: keywordMatch?.rule.id ?? null,
    matchedKnowledgeId: knowledgeMatch?.item.id ?? null,
  };
}

async function loadThread(supabase: SupabaseClient<any>, context: AgentContext) {
  const result = await supabase
    .from('conversation_threads')
    .select('id, business_id, playbook_id, ai_mode, status')
    .eq('id', context.threadId)
    .eq('business_id', context.businessId)
    .maybeSingle();
  if (result.error) throw new Error(`Thread lookup failed: ${result.error.message}`);
  return result.data;
}

async function loadPlaybook(
  supabase: SupabaseClient<any>,
  businessId: string,
  playbookId: string | null,
): Promise<AssistantPlaybook | null> {
  let query = supabase
    .from('assistant_playbooks')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true);
  query = playbookId
    ? query.eq('id', playbookId)
    : query.order('created_at', { ascending: false }).limit(1);
  const result = await query.maybeSingle();
  if (result.error) throw new Error(`Playbook lookup failed: ${result.error.message}`);
  if (!result.data) return null;
  return {
    ...result.data,
    keyword_replies: Array.isArray(result.data.keyword_replies) ? result.data.keyword_replies : [],
    fallback_reply: String(result.data.fallback_reply || '').trim(),
  } as AssistantPlaybook;
}

async function loadChannel(
  supabase: SupabaseClient<any>,
  businessId: string,
  channelId: string,
): Promise<BusinessChannel & { channel_id: string; config?: Record<string, unknown> } | null> {
  const result = await supabase
    .from('business_channels')
    .select('*')
    .eq('id', channelId)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .maybeSingle();
  if (result.error) throw new Error(`Channel lookup failed: ${result.error.message}`);
  return result.data;
}

async function findKnowledgeMatch(
  supabase: SupabaseClient<any>,
  businessId: string,
  playbookId: string,
  message: string,
): Promise<KnowledgeMatch | null> {
  const result = await supabase
    .from('assistant_knowledge_items')
    .select('*')
    .eq('business_id', businessId)
    .eq('status', 'published')
    .eq('is_active', true)
    .or(`playbook_id.eq.${playbookId},playbook_id.is.null`)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (result.error) throw new Error(`Knowledge lookup failed: ${result.error.message}`);

  const items = (result.data || []) as AssistantKnowledgeItem[];
  const rules: KeywordReplyRule[] = items.map((item, index) => ({
    id: item.id,
    label: item.title,
    keywords: [...new Set([
      ...(item.keywords || []),
      item.question || '',
      item.title,
    ].map(normalizeMessage).filter(Boolean))],
    match_type: 'word',
    reply: item.content,
    priority: knowledgePriority(item.type) - index / 1000,
    enabled: item.status === 'published' && item.is_active,
    handoff: false,
    fuzzy_enabled: true,
    fuzzy_threshold: 0.86,
    interactive_buttons: item.interactive_buttons,
  }));
  const match = findKeywordReply(message, rules);
  if (!match) return null;
  const item = items.find((candidate) => candidate.id === match.rule.id);
  return item ? { item, match } : null;
}

async function resolveRuleMedia(
  supabase: SupabaseClient<any>,
  businessId: string,
  playbookId: string,
  rule: KeywordReplyRule,
): Promise<RuleMedia | null> {
  if (rule.media_asset_id) {
    const result = await supabase
      .from('playbook_media_assets')
      .select('id, storage_bucket, storage_path, media_type, file_name, status')
      .eq('id', rule.media_asset_id)
      .eq('business_id', businessId)
      .eq('playbook_id', playbookId)
      .eq('rule_id', rule.id)
      .eq('status', 'ready')
      .maybeSingle();
    if (result.error) throw new Error(`Media lookup failed: ${result.error.message}`);
    if (result.data) {
      const signed = await supabase.storage
        .from(result.data.storage_bucket)
        .createSignedUrl(result.data.storage_path, 10 * 60);
      if (signed.data?.signedUrl) {
        return {
          type: result.data.media_type,
          url: signed.data.signedUrl,
          filename: result.data.file_name,
          assetId: result.data.id,
        };
      }
    }
  }

  if (rule.media_url && rule.media_type) {
    return {
      type: rule.media_type,
      url: rule.media_url,
      filename: rule.media_name,
    };
  }
  return null;
}

function resolveKnowledgeMedia(item: AssistantKnowledgeItem | null): RuleMedia | null {
  if (!item?.media_url) return null;
  const type = inferMediaType(item.media_url);
  return type ? { type, url: item.media_url } : null;
}

function inferMediaType(url: string): WhatsAppMedia['type'] | null {
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\.(jpe?g|png)$/.test(path)) return 'image';
    if (/\.mp4$/.test(path)) return 'video';
    if (/\.pdf$/.test(path)) return 'document';
  } catch {
    return null;
  }
  return null;
}

function normalizeButtons(buttons: WhatsAppQuickReplyButton[]) {
  return (buttons || []).slice(0, 3).map((button) => ({
    title: String(button.title || '').trim(),
    payload: String(button.payload || '').trim(),
  })).filter((button) => button.title && button.payload);
}

async function isFirstAutomatedReply(supabase: SupabaseClient<any>, threadId: string) {
  const result = await supabase
    .from('conversation_messages')
    .select('id')
    .eq('thread_id', threadId)
    .eq('direction', 'outbound')
    .limit(1);
  if (result.error) throw new Error(`Outbound history lookup failed: ${result.error.message}`);
  return !result.data?.length;
}

async function recordAuditOutbound(
  supabase: SupabaseClient<any>,
  context: AgentContext,
  body: string,
  messageType: string,
  outbound: WhatsAppSendResult,
) {
  const builderId = await resolveLegacyBuilderId(supabase, context.businessId);
  if (!builderId) return null;
  const result = await supabase
    .from('whatsapp_messages')
    .insert({
      builder_id: builderId,
      direction: 'outbound',
      phone: normalizePhone(context.phone),
      wa_message_id: outbound.messageId,
      message_type: messageType,
      body,
      status: outbound.status,
      error: outbound.error,
      agent: 'vercel-sales-engine',
      interactive_payload: {},
      template_params: [{ business_id: context.businessId }],
    })
    .select('id')
    .maybeSingle();
  return result.data?.id ?? null;
}

async function recordCanonicalOutbound(
  supabase: SupabaseClient<any>,
  context: AgentContext,
  body: string,
  messageType: string,
  mediaUrl: string | null,
  outbound: WhatsAppSendResult,
  auditMessageId: string | null,
  metadata: Record<string, unknown>,
) {
  const result = await supabase.from('conversation_messages').insert({
    thread_id: context.threadId,
    contact_id: context.contactId,
    business_id: context.businessId,
    builder_id: null,
    whatsapp_message_id: auditMessageId,
    direction: 'outbound',
    role: 'assistant',
    channel: 'whatsapp',
    message_type: messageType,
    content: body,
    body,
    media_url: mediaUrl,
    provider_msg_id: outbound.messageId,
    status: outbound.status,
    agent: 'vercel-sales-engine',
    metadata: { ...metadata, error: outbound.error },
  });
  if (result.error) throw new Error(`Outbound persistence failed: ${result.error.message}`);
  await supabase
    .from('conversation_threads')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', context.threadId)
    .eq('business_id', context.businessId);
}

async function createHandoff(
  supabase: SupabaseClient<any>,
  context: AgentContext,
  reason: string,
  priority: 'high' | 'critical',
  summary: string,
) {
  const existing = await supabase
    .from('handoff_events')
    .select('id')
    .eq('business_id', context.businessId)
    .eq('thread_id', context.threadId)
    .eq('reason', reason)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle();
  if (!existing.data) {
    await supabase.from('handoff_events').insert({
      business_id: context.businessId,
      thread_id: context.threadId,
      reason,
      priority,
      status: 'pending',
      summary,
    });
    await incrementUsage(supabase, context.businessId, 'handoffs');
  }
}

async function enqueueFirstFollowup(
  supabase: SupabaseClient<any>,
  context: AgentContext,
  playbookId: string,
) {
  const scoped = await supabase
    .from('followup_sequences')
    .select('id, steps')
    .eq('business_id', context.businessId)
    .eq('playbook_id', playbookId)
    .eq('active', true)
    .maybeSingle();
  const fallback = scoped.data ? null : await supabase
    .from('followup_sequences')
    .select('id, steps')
    .eq('business_id', context.businessId)
    .is('playbook_id', null)
    .eq('active', true)
    .maybeSingle();
  const sequence = scoped.data || fallback?.data;
  const steps = normalizeFollowupSteps(sequence?.steps);
  if (!sequence || !steps.length) return;
  await supabase.from('followup_jobs').upsert({
    sequence_id: sequence.id,
    thread_id: context.threadId,
    contact_id: context.contactId,
    business_id: context.businessId,
    step_index: 0,
    scheduled_at: scheduleAt(steps[0].day),
  }, { onConflict: 'sequence_id,thread_id,step_index', ignoreDuplicates: true });
}

function normalizeFollowupSteps(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map((step) => ({
      day: Number(step?.day),
      message: String(step?.message || '').trim(),
    }))
    .filter((step) => Number.isInteger(step.day) && step.day >= 0 && step.message);
}

function scheduleAt(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function incrementUsage(
  supabase: SupabaseClient<any>,
  businessId: string,
  field: 'messages_out' | 'handoffs',
) {
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from('business_usage').upsert(
    { business_id: businessId, date: today },
    { onConflict: 'business_id,date', ignoreDuplicates: true },
  );
  const current = await supabase
    .from('business_usage')
    .select(field)
    .eq('business_id', businessId)
    .eq('date', today)
    .maybeSingle();
  if (!current.error) {
    const usage = current.data as Record<string, unknown> | null;
    await supabase
      .from('business_usage')
      .update({ [field]: Number(usage?.[field] ?? 0) + 1 })
      .eq('business_id', businessId)
      .eq('date', today);
  }
}

function channelAccessToken(channel: { config?: Record<string, unknown> }) {
  const configured = channel.config?.whatsapp_access_token || channel.config?.access_token;
  return typeof configured === 'string' && configured.trim() ? configured.trim() : null;
}

function mandatoryHandoffReason(message: string, vertical: string) {
  const normalized = normalizeMessage(message);
  return (handoffTriggers[vertical] || handoffTriggers.other)
    .find((term) => normalized.includes(normalizeMessage(term))) || null;
}

function mandatoryHandoffReply(vertical: string) {
  if (vertical === 'clinic') {
    return 'This request needs immediate human attention. For a medical emergency, please contact local emergency services now. Our team has been alerted.';
  }
  return 'This request needs a team member. We have alerted the business owner, who will reply shortly.';
}

function knowledgePriority(type: AssistantKnowledgeItem['type']) {
  return {
    pricing: 90,
    policy: 85,
    location: 80,
    offer: 75,
    service: 70,
    faq: 60,
    document: 50,
    other: 40,
  }[type] ?? 40;
}

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}
