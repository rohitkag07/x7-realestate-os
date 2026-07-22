import express from 'express';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const PORT = Number(process.env.PORT || 8082);
const AGENT_SECRET = process.env.AGENT_SECRET || '';
const DEFAULT_BUILDER_ID = process.env.DEFAULT_BUILDER_ID || '';
const DEFAULT_PROJECT_ID = process.env.DEFAULT_PROJECT_ID || '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID || '';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN || '';
const WHATSAPP_GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v22.0';
const META_APP_SECRET = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || process.env.APP_SECRET || '';
const SUPABASE_FETCH_TIMEOUT_MS = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || 8000);
const WEBHOOK_HANDLER_TIMEOUT_MS = Number(process.env.WEBHOOK_HANDLER_TIMEOUT_MS || 10000);
const TIMEOUT_FALLBACK_MESSAGE = 'Pandit ji abhi busy hain... kripya thodi der baad try karein. 🙏';
// Default business ID for trial/fallback — same as DEFAULT_BUILDER_ID in the
// mapping layer (builders.id == businesses.id after migration 009).
const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID || DEFAULT_BUILDER_ID || '';
// Usage limits: messages_per_day for trial plan (overridden per plan from DB)
const TRIAL_MESSAGES_PER_DAY = Number(process.env.TRIAL_MESSAGES_PER_DAY || 50);

const AGENT_TARGETS = {
  tool_gateway: {
    service: 'x7-re-tool-gateway',
    baseUrl: (process.env.TOOL_GATEWAY_URL || 'http://localhost:8081').replace(/\/$/, ''),
    healthPath: '/health',
  },
  sales: {
    service: 'x7-re-sales-agent',
    baseUrl: (process.env.SALES_AGENT_URL || 'http://localhost:8080').replace(/\/$/, ''),
    healthPath: '/health',
  },
  content: {
    service: 'x7-re-content-agent',
    baseUrl: (process.env.CONTENT_AGENT_URL || 'http://localhost:8083').replace(/\/$/, ''),
    healthPath: '/health',
  },
  ads: {
    service: 'x7-re-ads-agent',
    baseUrl: (process.env.ADS_AGENT_URL || 'http://localhost:8085').replace(/\/$/, ''),
    healthPath: '/health',
  },
  colony: {
    service: 'x7-re-colony-agent',
    baseUrl: (process.env.COLONY_AGENT_URL || 'http://localhost:8087').replace(/\/$/, ''),
    healthPath: '/health',
  },
  finance: {
    service: 'x7-re-finance-agent',
    baseUrl: (process.env.FINANCE_AGENT_URL || 'http://localhost:8088').replace(/\/$/, ''),
    healthPath: '/health',
  },
  ghost_closer: {
    service: 'x7-re-ghost-closer',
    baseUrl: (process.env.GHOST_CLOSER_URL || 'http://localhost:8086').replace(/\/$/, ''),
    healthPath: '/health',
  },
};

const app = express();
app.use(express.json({
  limit: '2mb',
  verify(req, _res, buf) {
    req.rawBody = buf.toString('utf8');
  },
}));

let _supabase = null;
function fetchWithTimeout(input, init = {}) {
  const timeoutSignal = AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;
  return fetch(input, { ...init, signal });
}

function supabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
  return _supabase;
}

function logEvent(event, details = {}) {
  console.log(JSON.stringify({
    service: 'x7-re-summoner',
    event,
    time: new Date().toISOString(),
    ...details,
  }));
}

function requireSecret(req, res, next) {
  if (req.path === '/health' || req.path === '/health/dependencies' || req.path === '/webhook' || req.path === '/webhooks/whatsapp') return next();
  if (!AGENT_SECRET) return next();

  const presented = req.header('x-agent-secret')
    || req.header('authorization')?.replace(/^Bearer\s+/i, '')
    || '';

  if (presented !== AGENT_SECRET) {
    return res.status(401).json({ ok: false, error: 'invalid agent secret' });
  }

  return next();
}

async function agentFetch(targetKey, endpoint, payload = {}) {
  const target = AGENT_TARGETS[targetKey];
  if (!target) throw new Error(`unknown target agent: ${targetKey}`);

  const response = await fetch(`${target.baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(AGENT_SECRET ? { 'x-agent-secret': AGENT_SECRET } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12_000),
  });

  const text = await response.text();
  const data = text ? safeJson(text) : {};
  if (!response.ok) {
    throw new Error((data && typeof data === 'object' && data.error) || `${target.service} ${endpoint} failed with ${response.status}`);
  }
  return data;
}

function safeJson(input) {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

async function logRun({ builderId, action, input = {}, output = {}, status = 'success', error = null, durationMs = null }) {
  const sb = supabase();
  if (!sb || !builderId) return;

  try {
    await sb.from('agent_runs').insert({
      builder_id: builderId,
      agent: 'summoner',
      action,
      project_id: input.project_id || output.project_id || null,
      input,
      output,
      status,
      error,
      duration_ms: durationMs,
    });
  } catch (logError) {
    logEvent('log_run_failed', { error: logError.message });
  }
}

function validateMetaSignature(req) {
  if (!META_APP_SECRET) {
    logEvent('webhook_signature_secret_missing', { production: process.env.NODE_ENV === 'production' });
    return process.env.NODE_ENV !== 'production';
  }

  const signature = req.header('x-hub-signature-256') || '';
  if (!signature.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', META_APP_SECRET)
    .update(req.rawBody || '', 'utf8')
    .digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label}_timeout`);
      error.code = 'timeout';
      reject(error);
    }, ms);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeout,
  ]);
}

function extractFirstIncomingPhone(payload) {
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      const message = change?.value?.messages?.[0];
      if (message?.from) return normalizePhone(message.from);
    }
  }
  return '';
}

async function sendWebhookTimeoutFallback(to) {
  if (!to || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_ACCESS_TOKEN) {
    return { ok: false, skipped: true, reason: 'missing_whatsapp_env' };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizeOutboundPhone(to),
          type: 'text',
          text: {
            preview_url: false,
            body: TIMEOUT_FALLBACK_MESSAGE,
          },
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    const payload = await response.json().catch(() => ({}));
    return response.ok
      ? { ok: true, message_id: payload?.messages?.[0]?.id ?? null }
      : { ok: false, status: response.status, error: payload?.error?.message || 'whatsapp_fallback_failed' };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

function normalizeOutboundPhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function mapMetaStatus(status) {
  switch (status) {
    case 'sent':
    case 'delivered':
    case 'read':
    case 'failed':
      return status;
    default:
      return 'sent';
  }
}

function mapInboundMessageType(type) {
  if (type === 'button') return 'button_reply';
  if (type === 'interactive') return 'list_reply';
  return type || 'text';
}

function extractMessageBody(message) {
  if (message?.text?.body) return message.text.body;
  if (message?.button?.text) return message.button.text;
  if (message?.interactive?.button_reply?.title) return message.interactive.button_reply.title;
  if (message?.interactive?.list_reply?.title) return message.interactive.list_reply.title;
  if (message?.image?.caption) return message.image.caption;
  if (message?.document?.caption) return message.document.caption;
  return '';
}

async function updateMessageStatus(status) {
  const sb = supabase();
  if (!sb || !status?.id) return;

  await sb.from('whatsapp_messages').update({
    status: mapMetaStatus(status.status),
    error: status?.errors?.[0]?.title ?? null,
  }).eq('wa_message_id', status.id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic business/channel resolution (Phase 2 — WhatsAI pivot)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up which business/channel owns a given WhatsApp phone_number_id.
 * Falls back to DEFAULT_BUSINESS_ID if no channel mapping is found.
 */
async function resolveBusinessChannel(channelId) {
  const sb = supabase();
  if (!sb || !channelId) {
    return { businessId: DEFAULT_BUSINESS_ID || null, businessChannelId: null };
  }

  const { data } = await sb
    .from('business_channels')
    .select('id, business_id, channel_phone, phone_number_id, channel_id')
    .or(`channel_id.eq.${channelId},phone_number_id.eq.${channelId}`)
    .limit(1)
    .maybeSingle();

  const businessId = data?.business_id || DEFAULT_BUSINESS_ID || null;
  logEvent('business_channel_resolved', {
    channelId,
    businessId,
    source: data?.business_id ? 'business_channels' : 'default',
  });
  return { businessId, businessChannelId: data?.id ?? null };
}

/**
 * Find or create a conversation_contact for this business+phone.
 * Returns the contact row.
 */
async function upsertConversationContact(businessId, phone, name) {
  const sb = supabase();
  if (!sb || !businessId || !phone) return null;

  const { data, error } = await sb
    .from('conversation_contacts')
    .upsert(
      {
        business_id: businessId,
        phone,
        name: name || null,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,phone', ignoreDuplicates: false }
    )
    .select('id, business_id, phone, name')
    .single();

  if (error) {
    logEvent('upsert_contact_failed', { error: error.message, businessId, phone });
    return null;
  }
  return data;
}

/**
 * Find or create an active conversation_thread for this contact.
 * We use the most recent active or bot_paused thread; create one if none exists.
 */
async function findOrCreateThread(businessId, contactId, playbookId = null, businessChannelId = null) {
  const sb = supabase();
  if (!sb || !businessId || !contactId) return null;

  let existingQuery = sb
    .from('conversation_threads')
    .select('id, status, lead_stage, temperature, playbook_id, business_channel_id')
    .eq('business_id', businessId)
    .eq('contact_id', contactId)
    .in('status', ['open', 'pending_human', 'automated', 'active', 'bot_paused', 'human_takeover'])
    .order('created_at', { ascending: false })
    .limit(1);

  existingQuery = businessChannelId
    ? existingQuery.eq('business_channel_id', businessChannelId)
    : existingQuery.is('business_channel_id', null);

  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await sb
    .from('conversation_threads')
    .insert({
      business_id: businessId,
      business_channel_id: businessChannelId,
      contact_id: contactId,
      playbook_id: playbookId || null,
      status: 'open',
      lead_stage: 'new',
      temperature: 'cold',
      channel: 'whatsapp',
      ai_mode: 'assistant',
      unread_count: 0,
      last_message_at: new Date().toISOString(),
    })
    .select('id, status, lead_stage, temperature, playbook_id, business_channel_id')
    .single();

  if (error) {
    logEvent('create_thread_failed', { error: error.message, businessId, contactId });
    return null;
  }
  return created;
}

/**
 * Find the active assistant_playbook for this business.
 */
async function findActivePlaybook(businessId) {
  const sb = supabase();
  if (!sb || !businessId) return null;

  const { data } = await sb
    .from('assistant_playbooks')
    .select('id, name, vertical')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

async function incrementBusinessUsage(businessId, field, amount = 1) {
  const sb = supabase();
  if (!sb || !businessId || !['messages_in', 'messages_out', 'handoffs', 'qual_answers'].includes(field)) return;

  const today = new Date().toISOString().split('T')[0];
  try {
    await sb.from('business_usage').upsert({
      business_id: businessId,
      date: today,
    }, { onConflict: 'business_id,date' });

    const { data, error } = await sb
      .from('business_usage')
      .select(field)
      .eq('business_id', businessId)
      .eq('date', today)
      .maybeSingle();

    if (error) throw error;

    const current = Number(data?.[field] ?? 0);
    const update = {};
    update[field] = current + amount;

    const { error: updateError } = await sb
      .from('business_usage')
      .update(update)
      .eq('business_id', businessId)
      .eq('date', today);

    if (updateError) throw updateError;
    logEvent('usage_incremented', { businessId, field, amount });
  } catch (error) {
    logEvent('usage_increment_failed', { businessId, field, error: error.message });
  }
}

/**
 * Persist the inbound message in conversation_messages (generic layer).
 */
async function recordGenericInboundMessage({
  businessId,
  threadId,
  contactId = null,
  builderId = null,
  leadId = null,
  content,
  messageType,
  providerMsgId,
  mediaUrl = null,
  metadata = {},
}) {
  const sb = supabase();
  if (!sb || !threadId) return;
  const createdAt = new Date().toISOString();

  const { error } = await sb.from('conversation_messages').insert({
    thread_id: threadId,
    contact_id: contactId,
    business_id: businessId,
    builder_id: builderId,
    lead_id: leadId,
    direction: 'inbound',
    role: 'user',
    content: content || null,
    body: content || null,
    media_url: mediaUrl,
    message_type: messageType || 'text',
    provider_msg_id: providerMsgId || null,
    channel: 'whatsapp',
    status: 'received',
    created_at: createdAt,
    metadata,
  });

  if (error) {
    logEvent('record_generic_message_failed', { error: error.message, threadId });
    return;
  }

  logEvent('conversation_message_saved', {
    businessId,
    threadId,
    direction: 'inbound',
    messageType: messageType || 'text',
  });

  await sb
    .from('conversation_threads')
    .update({
      last_message_at: createdAt,
      unread_count: 1,
    })
    .eq('id', threadId);

  if (contactId) {
    await sb
      .from('conversation_contacts')
      .update({
        last_message_at: createdAt,
        last_active_at: createdAt,
      })
      .eq('id', contactId);
  }

  await incrementBusinessUsage(businessId, 'messages_in');
}

async function getQualificationAnswers(threadId) {
  const sb = supabase();
  if (!sb || !threadId) return {};

  const { data, error } = await sb
    .from('lead_qualification_answers')
    .select('question_key, answer_value')
    .eq('thread_id', threadId);

  if (error || !data?.length) return {};
  return Object.fromEntries(data.map((row) => [row.question_key, row.answer_value]));
}

async function getLastPlaybookQuestionKey(threadId) {
  const sb = supabase();
  if (!sb || !threadId) return null;

  const { data, error } = await sb
    .from('conversation_messages')
    .select('metadata')
    .eq('thread_id', threadId)
    .eq('direction', 'outbound')
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data?.length) return null;
  const row = data.find((item) => typeof item?.metadata?.question_key === 'string');
  return row?.metadata?.question_key || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy real-estate helpers (kept intact for parity)
// ─────────────────────────────────────────────────────────────────────────────

async function findResidentByPhone(phone) {
  const sb = supabase();
  if (!sb || !phone) return null;

  const candidates = [phone, normalizePhone(phone), normalizeOutboundPhone(phone)];
  for (const candidate of candidates) {
    const resident = await sb
      .from('residents')
      .select('id, project_id, name, phone, plot_id, status')
      .eq('phone', candidate)
      .maybeSingle();
    if (resident.data) return resident.data;
  }

  return null;
}

async function findLeadByPhone(phone) {
  const sb = supabase();
  if (!sb || !phone) return null;

  const candidates = [phone, normalizePhone(phone), normalizeOutboundPhone(phone)];
  for (const candidate of candidates) {
    const lead = await sb
      .from('leads')
      .select('id, builder_id, project_id, name, phone, lead_stage')
      .eq('phone', candidate)
      .maybeSingle();
    if (lead.data) return lead.data;
  }

  return null;
}

async function createLeadFromInboundMessage({ phone, builderId, projectId, name }) {
  const sb = supabase();
  if (!sb || !builderId) return null;

  const insert = await sb.from('leads').insert({
    builder_id: builderId,
    project_id: projectId,
    name,
    phone,
    source: 'whatsapp',
    lead_stage: 'new',
    temperature: 'warm',
    lead_score: 36,
    notes: 'Auto-created from Summoner WhatsApp webhook.',
    last_contacted_at: new Date().toISOString(),
  }).select('id, builder_id, project_id, name, phone, lead_stage').single();

  return insert.data ?? null;
}

async function recordWhatsAppMessage({
  builderId,
  leadId = null,
  residentId = null,
  direction,
  phone,
  waMessageId,
  messageType,
  body,
  mediaUrl = null,
  status,
  error = null,
  interactivePayload = {},
  projectId = null,
  agent = 'summoner-webhook',
}) {
  const sb = supabase();
  if (!sb || !builderId || !phone) return;

  const payload = {
    builder_id: builderId,
    lead_id: leadId || null,
    resident_id: residentId || null,
    direction,
    phone,
    wa_message_id: waMessageId,
    message_type: messageType,
    body: body || null,
    media_url: mediaUrl,
    interactive_payload: interactivePayload,
    status,
    error,
    agent,
    template_params: projectId ? [{ project_id: projectId }] : [],
  };

  const { error: insertError } = await sb.from('whatsapp_messages').insert(payload);
  if (!insertError) return;

  if (waMessageId && insertError.code === '23505') {
    const { error: updateError } = await sb
      .from('whatsapp_messages')
      .update(payload)
      .eq('wa_message_id', waMessageId);

    if (!updateError) return;
    logEvent('wa_message_update_failed', { waMessageId, error: updateError.message });
    return;
  }

  logEvent('wa_message_insert_failed', { waMessageId, error: insertError.message });
}

async function resolveBuilderContext({ resident, lead }) {
  const sb = supabase();
  if (!sb) {
    return {
      builderId: lead?.builder_id || DEFAULT_BUILDER_ID || null,
      projectId: resident?.project_id || lead?.project_id || DEFAULT_PROJECT_ID || null,
    };
  }

  if (resident?.project_id) {
    const project = await sb.from('projects').select('id, builder_id').eq('id', resident.project_id).maybeSingle();
    if (project.data) {
      return { builderId: project.data.builder_id, projectId: project.data.id };
    }
  }

  return {
    builderId: lead?.builder_id || DEFAULT_BUILDER_ID || null,
    projectId: resident?.project_id || lead?.project_id || DEFAULT_PROJECT_ID || null,
  };
}

const routeSchema = z.object({
  channel: z.enum(['whatsapp', 'dashboard', 'telegram', 'api']).default('whatsapp').optional(),
  source: z.string().optional(),
  locale: z.enum(['hi', 'en', 'hi-en']).default('hi-en').optional(),
  execute: z.boolean().default(false).optional(),
  send_via_whatsapp: z.boolean().default(false).optional(),
  builder_id: z.string().optional(),
  project_id: z.string().optional(),
  lead: z.object({
    id: z.string().optional(),
    builder_id: z.string().optional(),
    project_id: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  resident: z.object({
    id: z.string().optional(),
    project_id: z.string().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    plot_number: z.string().optional(),
  }).optional(),
  builder: z.object({
    id: z.string().optional(),
    company_name: z.string().optional(),
  }).optional(),
  message: z.union([
    z.string().min(1),
    z.object({
      text: z.string().optional(),
      button_reply_id: z.string().optional(),
      type: z.string().optional(),
    }),
  ]),
});

const dispatchSchema = z.object({
  target_agent: z.enum(['sales', 'content', 'ads', 'ghost_closer', 'colony', 'finance']),
  endpoint: z.string().min(1),
  payload: z.record(z.any()).default({}).optional(),
});

const queueEnqueueSchema = z.object({
  builder_id: z.string().min(1),
  project_id: z.string().optional(),
  lead_id: z.string().optional(),
  resident_id: z.string().optional(),
  source: z.string().default('system').optional(),
  target_agent: z.enum(['sales', 'content', 'ads', 'ghost_closer', 'colony', 'finance']),
  endpoint: z.string().min(1),
  dedupe_key: z.string().optional(),
  payload: z.record(z.any()).default({}).optional(),
  scheduled_for: z.string().datetime().optional(),
  max_attempts: z.number().int().positive().max(10).default(3).optional(),
});

const queueDrainSchema = z.object({
  limit: z.number().int().positive().max(100).default(25).optional(),
  dry_run: z.boolean().default(false).optional(),
});

const cronRunSchema = z.object({
  cron_key: z.string().min(1).optional(),
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  dry_run: z.boolean().default(false).optional(),
  limit: z.number().int().positive().max(100).default(25).optional(),
  builder_id: z.string().optional(),
  project_id: z.string().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

function normalizeRouteInput(payload) {
  const message = typeof payload.message === 'string'
    ? { text: payload.message }
    : payload.message;
  const text = (message?.text || '').trim();

  return {
    channel: payload.channel || 'whatsapp',
    source: payload.source || 'unknown',
    locale: payload.locale || 'hi-en',
    execute: payload.execute === true,
    sendViaWhatsApp: payload.send_via_whatsapp === true,
    builderId: payload.builder_id || payload.lead?.builder_id || payload.builder?.id || DEFAULT_BUILDER_ID || null,
    projectId: payload.project_id || payload.lead?.project_id || payload.resident?.project_id || DEFAULT_PROJECT_ID || null,
    lead: payload.lead || null,
    resident: payload.resident || null,
    builder: payload.builder || null,
    message: message || { text: '' },
    text,
    buttonReplyId: message?.button_reply_id || '',
  };
}

function inferIntent(ctx) {
  const lower = ctx.text.toLowerCase();
  const buttonId = ctx.buttonReplyId.toLowerCase();

  if (buttonId.startsWith('colony_visitor_') || buttonId.startsWith('colony_poll_')) {
    return 'visitor';
  }

  if (ctx.resident) {
    if (/(visitor|gate|allow|deny|guest|delivery|entry)/.test(lower)) return 'visitor';
    if (/(payment|invoice|bill|maintenance|receipt|dues|paisa)/.test(lower)) return 'payment_query';
    if (/(clubhouse|amenity|suite|court|booking slot|hall)/.test(lower)) return 'amenity_booking';
    if (/(complaint|issue|problem|seepage|water|lift|security|plumber|electric|garbage|clean)/.test(lower)) return 'complaint';
    return 'complaint';
  }

  if (/(content|calendar|caption|reel|video|creative|post)/.test(lower)) return 'content_request';
  if (/(campaign|meta ad|facebook ad|instagram ad|audience|lead gen|retarget)/.test(lower)) return 'campaign_request';
  if (/(book|booking|token|hold|upi|payment|price|cost sheet)/.test(lower)) return 'booking';
  return 'sales_inquiry';
}

function buildRouteDecision(ctx) {
  const intent = inferIntent(ctx);

  switch (intent) {
    case 'sales_inquiry':
    case 'booking':
      return {
        intent,
        target_agent: 'sales',
        endpoint: '/qualify',
        payload: {
          message: ctx.text,
          locale: ctx.locale,
          lead: ctx.lead || {
            builder_id: ctx.builderId || undefined,
            project_id: ctx.projectId || undefined,
          },
          source: ctx.source,
          send_via_whatsapp: ctx.sendViaWhatsApp,
        },
        ready: Boolean(ctx.text),
        missing_fields: ctx.text ? [] : ['message.text'],
      };
    case 'content_request':
      return {
        intent,
        target_agent: 'content',
        endpoint: '/calendar/generate',
        payload: {
          builder_id: ctx.builderId,
          project_id: ctx.projectId,
        },
        ready: Boolean(ctx.builderId && ctx.projectId),
        missing_fields: missingFields([
          ['builder_id', ctx.builderId],
          ['project_id', ctx.projectId],
        ]),
      };
    case 'campaign_request':
      return {
        intent,
        target_agent: 'ads',
        endpoint: '/campaign/full-funnel',
        payload: {
          builder_id: ctx.builderId,
          project_id: ctx.projectId,
        },
        ready: Boolean(ctx.builderId && ctx.projectId),
        missing_fields: missingFields([
          ['builder_id', ctx.builderId],
          ['project_id', ctx.projectId],
        ]),
      };
    case 'payment_query': {
      const wantsRevenue = /(revenue|summary|collection|report)/.test(ctx.text.toLowerCase()) && !ctx.resident;
      return wantsRevenue
        ? {
            intent,
            target_agent: 'finance',
            endpoint: '/report/revenue',
            payload: {
              builder_id: ctx.builderId,
            },
            ready: Boolean(ctx.builderId),
            missing_fields: missingFields([
              ['builder_id', ctx.builderId],
            ]),
          }
        : {
            intent,
            target_agent: 'colony',
            endpoint: '/inbound',
            payload: {
              message: {
                text: ctx.text,
                button_reply_id: ctx.buttonReplyId || undefined,
              },
              resident: ctx.resident,
              builder: ctx.builder || (ctx.builderId ? { id: ctx.builderId } : undefined),
            },
            ready: Boolean(ctx.resident),
            missing_fields: missingFields([
              ['resident', ctx.resident],
            ]),
          };
    }
    case 'visitor':
    case 'complaint':
    case 'amenity_booking':
      return {
        intent,
        target_agent: 'colony',
        endpoint: '/inbound',
        payload: {
          message: {
            text: ctx.text,
            button_reply_id: ctx.buttonReplyId || undefined,
          },
          resident: ctx.resident,
          builder: ctx.builder || (ctx.builderId ? { id: ctx.builderId } : undefined),
        },
        ready: Boolean(ctx.resident),
        missing_fields: missingFields([
          ['resident', ctx.resident],
        ]),
      };
    default:
      return {
        intent: 'sales_inquiry',
        target_agent: 'sales',
        endpoint: '/qualify',
        payload: {
          message: ctx.text,
          locale: ctx.locale,
          lead: ctx.lead || undefined,
          source: ctx.source,
          send_via_whatsapp: ctx.sendViaWhatsApp,
        },
        ready: Boolean(ctx.text),
        missing_fields: ctx.text ? [] : ['message.text'],
      };
  }
}

function missingFields(entries) {
  return entries.filter(([, value]) => !value).map(([key]) => key);
}

async function handleInboundWhatsAppMessage(message, envelope) {
  const phone = normalizePhone(message?.from);
  const body = extractMessageBody(message);
  const channelId = envelope?.metadata?.phone_number_id || null;

  if (await isDuplicateInboundMessage(message?.id)) {
    logEvent('duplicate_webhook_skipped', { waMessageId: message.id });
    return { ok: true, skipped: true, reason: 'duplicate_webhook' };
  }

  // ── Phase 2: Generic business context resolution ──────────────────────────
  const channelContext = await resolveBusinessChannel(channelId);
  const businessId = channelContext.businessId;

  let contact = null;
  let thread = null;
  let playbook = null;

  if (businessId) {
    // Ensure a contact record exists for this phone in the generic layer.
    const contactName = message?.profile?.name || null;
    contact = await upsertConversationContact(businessId, phone, contactName);

    if (contact) {
      playbook = await findActivePlaybook(businessId);
      thread = await findOrCreateThread(businessId, contact.id, playbook?.id ?? null, channelContext.businessChannelId);
    }
  }
  // ── End Phase 2 generic resolution ───────────────────────────────────────

  // ── Phase 5: Usage limit gate ─────────────────────────────────────────────
  if (businessId) {
    const limited = await checkUsageLimit(businessId);
    if (limited) {
      logEvent('usage_limit_exceeded', { businessId, phone });
      return { ok: true, skipped: true, reason: 'usage_limit_exceeded' };
    }
  }
  // ── End Phase 5 gate ─────────────────────────────────────────────────────

  // ── Legacy real-estate resolution (kept intact until generic routes prove parity) ──
  const resident = await findResidentByPhone(phone);

  let lead = resident ? null : await findLeadByPhone(phone);

  let { builderId, projectId } = await resolveBuilderContext({ resident, lead });

  if (!resident && !lead && builderId) {
    lead = await createLeadFromInboundMessage({
      phone,
      builderId,
      projectId,
      name: `WhatsApp Lead ${phone.slice(-4)}`,
    });
  }

  if (!builderId && lead?.builder_id) builderId = lead.builder_id;
  if (!projectId && lead?.project_id) projectId = lead.project_id;

  // ── Dual-write: persist in both legacy and generic tables ─────────────────
  if (builderId) {
    await recordWhatsAppMessage({
      builderId,
      leadId: lead?.id ?? null,
      residentId: resident?.id ?? null,
      direction: 'inbound',
      phone,
      waMessageId: message.id,
      messageType: mapInboundMessageType(message.type),
      body,
      status: 'received',
      interactivePayload: message.interactive ?? {},
      projectId,
      agent: resident ? 'summoner-colony-webhook' : 'summoner-sales-webhook',
    });
  }

  if (thread) {
    await recordGenericInboundMessage({
      businessId,
      threadId: thread.id,
      contactId: contact?.id ?? null,
      builderId,
      leadId: lead?.id ?? null,
      content: body,
      messageType: mapInboundMessageType(message.type),
      providerMsgId: message.id,
      metadata: {
        interactive: message.interactive ?? undefined,
        envelope_metadata: envelope?.metadata ?? undefined,
      },
    });

    // Any customer reply makes prior nudges irrelevant. The sales agent creates a
    // new sequence only for the first automated answer, preventing duplicate sends.
    const sb = supabase();
    if (sb) {
      await sb
        .from('followup_jobs')
        .update({ status: 'cancelled', updated_at: new Date().toISOString(), locked_at: null })
        .eq('thread_id', thread.id)
        .eq('business_id', businessId)
        .eq('status', 'pending');
    }
  }
  // ── End dual-write ───────────────────────────────────────────────────────

  if (!body && !message?.interactive?.button_reply?.title && !message?.interactive?.list_reply?.title) {
    return { ok: true, skipped: true, reason: 'empty_body' };
  }

  // Generic context to append to all agent payloads for downstream awareness.
  const genericCtx = businessId
    ? {
        business_id: businessId,
        contact_id: contact?.id ?? null,
        thread_id: thread?.id ?? null,
        playbook_id: playbook?.id ?? null,
        playbook_vertical: playbook?.vertical ?? null,
      }
    : {};

  // Every configured business uses its tenant-scoped deterministic playbook.
  if (businessId && playbook?.id) {
    const result = await agentFetch('sales', '/playbook/respond', {
      business_id: businessId,
      playbook_id: playbook.id,
      thread_id: thread?.id ?? null,
      contact_id: contact?.id ?? null,
      phone,
      message: body,
      send_via_whatsapp: true,
    });

    await logRun({
      builderId: businessId,
      action: 'webhook-inbound-keyword-playbook',
      input: { from: phone, body, playbook_id: playbook.id },
      output: result,
    });

    return result;
  }

  if (resident) {
    const result = await agentFetch('colony', '/inbound', {
      message: {
        text: body,
        button_reply_id: message?.interactive?.button_reply?.id ?? message?.button?.payload ?? undefined,
      },
      resident,
      builder: builderId ? { id: builderId } : undefined,
      ...genericCtx,
    });

    await logRun({
      builderId,
      action: 'webhook-inbound-colony',
      input: {
        from: phone,
        body,
        message_type: message.type,
        metadata: envelope?.metadata ?? null,
        ...genericCtx,
      },
      output: result,
    });

    return result;
  }

  const result = await agentFetch('sales', '/qualify', {
    message: body,
    locale: 'hi-en',
    source: 'summoner_whatsapp_webhook',
    send_via_whatsapp: true,
    lead: {
      id: lead?.id,
      builder_id: builderId,
      project_id: projectId,
      name: lead?.name,
      phone,
    },
    ...genericCtx,
  });

  await logRun({
    builderId,
    action: 'webhook-inbound-sales',
    input: {
      from: phone,
      body,
      message_type: message.type,
      metadata: envelope?.metadata ?? null,
      ...genericCtx,
    },
    output: result,
  });

  return result;
}

async function isDuplicateInboundMessage(waMessageId) {
  const sb = supabase();
  if (!sb || !waMessageId) return false;
  const { data, error } = await sb
    .from('whatsapp_messages')
    .select('id')
    .eq('wa_message_id', waMessageId)
    .eq('direction', 'inbound')
    .limit(1)
    .maybeSingle();
  if (error) {
    logEvent('duplicate_webhook_check_failed', { waMessageId, error: error.message });
    return false;
  }
  return Boolean(data);
}

async function handleWhatsAppWebhook(payload) {
  const changes = payload?.entry?.flatMap((entry) => entry?.changes || []) || [];

  for (const change of changes) {
    const value = change?.value || {};

    for (const status of value.statuses || []) {
      await updateMessageStatus(status);
    }

    for (const message of value.messages || []) {
      if (message?.from) {
        await handleInboundWhatsAppMessage(message, value);
      }
    }
  }
}

const CRON_JOBS = [
  {
    key: 'sales.dispatch_due',
    target_agent: 'sales',
    endpoint: '/dispatch-due',
    buildPayload: ({ limit }) => ({ limit }),
  },
  {
    key: 'content.render_pending',
    target_agent: 'content',
    endpoint: '/render-pending',
    buildPayload: ({ limit }) => ({ limit }),
  },
  {
    key: 'content.publish_due',
    target_agent: 'content',
    endpoint: '/publish-due',
    buildPayload: ({ limit }) => ({ limit }),
  },
  {
    key: 'ads.insights',
    target_agent: 'ads',
    endpoint: '/cron/insights',
    buildPayload: ({ limit, builderId }) => ({ limit, ...(builderId ? { builder_id: builderId } : {}) }),
  },
  {
    key: 'ads.optimize',
    target_agent: 'ads',
    endpoint: '/cron/optimize',
    buildPayload: ({ builderId }) => (builderId ? { builder_id: builderId } : {}),
  },
  {
    key: 'ads.capi',
    target_agent: 'ads',
    endpoint: '/cron/capi',
    buildPayload: ({ limit }) => ({ batch_size: limit }),
  },
  {
    key: 'ghost-closer.hunt',
    target_agent: 'ghost_closer',
    endpoint: '/cron/hunt',
    buildPayload: ({ limit, builderId }) => ({ batch_size: limit, ...(builderId ? { builder_id: builderId } : {}) }),
  },
  {
    key: 'colony.reminders',
    target_agent: 'colony',
    endpoint: '/cron/reminders',
    buildPayload: () => ({}),
  },
  {
    key: 'colony.escalate',
    target_agent: 'colony',
    endpoint: '/cron/escalate',
    buildPayload: () => ({}),
  },
  {
    key: 'finance.monthly_summary',
    target_agent: 'finance',
    endpoint: '/cron/monthly-summary',
    buildPayload: ({ month }) => (month ? { month } : {}),
  },
];
// ─────────────────────────────────────────────────────────────────────────────
// Phase 5: Revenue — native Summoner cron jobs (run inside the Summoner, no sub-agent needed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check all trialing subscriptions for expiry and mark them.
 * Called by /cron/run-job with cron_key = 'trial.expire_check'
 */
async function runTrialExpireCheck() {
  const sb = supabase();
  if (!sb) return { ok: false, error: 'supabase_not_configured' };

  const now = new Date().toISOString();

  // Find all trialing subscriptions that have passed their trial_end
  const { data: expired } = await sb
    .from('business_subscriptions')
    .select('id, business_id, trial_end, upgrade_prompted_at')
    .eq('status', 'trialing')
    .lt('trial_end', now);

  if (!expired?.length) return { ok: true, expired: 0 };

  const results = [];
  for (const sub of expired) {
    // Mark as expired
    await sb.from('business_subscriptions')
      .update({ status: 'expired', cancelled_at: now })
      .eq('id', sub.id);

    // Add a daily summary entry nudging the owner to upgrade
    await sb.from('daily_owner_summaries').insert({
      business_id: sub.business_id,
      date: now.split('T')[0],
      summary_text: '\u23F0 Aapka 7-day WhatsApp AI trial khatam ho gaya hai.\n\nUpgrade karke automatic lead replies, follow-up queue, aur daily hot-lead summary continue rakhein.\n\n⚡ Plans start at ₹2,999/month.\n\n\u23F0 Your 7-day WhatsApp AI trial has ended.\n\nUpgrade to continue automatic replies, follow-up, and daily summaries. Plans from ₹2,999/month.',
      metrics: { trial_expired: 1, upgrade_cta: true },
    });

    logEvent('trial_expired', { business_id: sub.business_id, trial_end: sub.trial_end });
    results.push({ business_id: sub.business_id, expired: true });
  }

  return { ok: true, expired: results.length, results };
}

/**
 * Roll up daily message counts from conversation_messages into business_usage.
 * Called by /cron/run-job with cron_key = 'usage.track_daily'
 */
async function runUsageTracking() {
  const sb = supabase();
  if (!sb) return { ok: false, error: 'supabase_not_configured' };

  const today = new Date().toISOString().split('T')[0];

  // Aggregate per business from conversation_threads -> conversation_messages for today
  const { data: businesses } = await sb
    .from('businesses')
    .select('id')
    .eq('status', 'active')
    .limit(200);

  if (!businesses?.length) return { ok: true, tracked: 0 };

  const results = [];
  for (const biz of businesses) {
    const { count: msgIn } = await sb
      .from('conversation_messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'inbound')
      .gte('created_at', `${today}T00:00:00Z`);

    const { count: msgOut } = await sb
      .from('conversation_messages')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'outbound')
      .gte('created_at', `${today}T00:00:00Z`);

    const { count: handoffs } = await sb
      .from('handoff_events')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', biz.id)
      .gte('created_at', `${today}T00:00:00Z`);

    await sb.from('business_usage').upsert({
      business_id: biz.id,
      date: today,
      messages_in:  msgIn  ?? 0,
      messages_out: msgOut ?? 0,
      handoffs:     handoffs ?? 0,
    }, { onConflict: 'business_id,date' });

    results.push({ business_id: biz.id });
  }

  return { ok: true, tracked: results.length };
}

// Register Phase 5 cron jobs into CRON_JOBS after the array is defined.
// These run inside the Summoner directly (no sub-agent needed).
const INTERNAL_CRON_JOBS = [
  { key: 'trial.expire_check', run: runTrialExpireCheck },
  { key: 'usage.track_daily',  run: runUsageTracking   },
];

/**
 * Check if a business has exceeded their plan's daily message limit.
 * Returns true if they are over-quota and should be blocked.
 */
async function checkUsageLimit(businessId) {
  const sb = supabase();
  if (!sb || !businessId) return false;

  const today = new Date().toISOString().split('T')[0];

  // Fetch today's usage
  const { data: usage } = await sb
    .from('business_usage')
    .select('messages_in, messages_out')
    .eq('business_id', businessId)
    .eq('date', today)
    .maybeSingle();

  if (!usage) return false;
  const totalToday = (usage.messages_in ?? 0) + (usage.messages_out ?? 0);

  // Fetch plan limit
  const { data: sub } = await sb
    .from('business_subscriptions')
    .select('status, subscription_plans(limits)')
    .eq('business_id', businessId)
    .maybeSingle();

  // If expired, always block
  if (sub?.status === 'expired') return true;

  const limit = sub?.subscription_plans?.limits?.messages_per_day ?? TRIAL_MESSAGES_PER_DAY;
  return totalToday >= limit;
}

async function logCronRun({ builderId = null, cronKey, targetAgent, input = {}, output = {}, status = 'success', durationMs = null, error = null }) {
  const sb = supabase();
  if (!sb) return;

  try {
    await sb.from('agent_cron_runs').insert({
      builder_id: builderId,
      cron_key: cronKey,
      target_agent: targetAgent,
      status,
      input,
      output,
      duration_ms: durationMs,
      error,
    });
  } catch (logError) {
    logEvent('log_cron_failed', { error: logError.message, cronKey });
  }
}

const startedAt = Date.now();
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'x7-re-summoner',
    phase: 'phase-6',
    supabase: Boolean(supabase()),
    whatsapp: {
      configured: Boolean(WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN),
      verify_token: Boolean(WHATSAPP_VERIFY_TOKEN),
      signature: Boolean(META_APP_SECRET),
    },
    uptime_s: Math.round((Date.now() - startedAt) / 1000),
    targets: Object.fromEntries(Object.entries(AGENT_TARGETS).map(([key, value]) => [key, value.baseUrl])),
    whatsapp_webhook: Boolean(WHATSAPP_VERIFY_TOKEN),
  });
});

app.get('/health/dependencies', async (_req, res) => {
  const checks = {};

  for (const [key, target] of Object.entries(AGENT_TARGETS)) {
    try {
      const response = await fetch(`${target.baseUrl}${target.healthPath}`, {
        signal: AbortSignal.timeout(2_500),
      });
      checks[key] = {
        configured: true,
        ok: response.ok,
        status: response.status,
        url: target.baseUrl,
      };
    } catch (error) {
      checks[key] = {
        configured: true,
        ok: false,
        url: target.baseUrl,
        error: error.message,
      };
    }
  }

  res.json({
    ok: true,
    service: 'x7-re-summoner',
    supabase: Boolean(supabase()),
    defaults: {
      default_builder_id: Boolean(DEFAULT_BUILDER_ID),
      default_project_id: Boolean(DEFAULT_PROJECT_ID),
    },
    whatsapp: {
      verify_token: Boolean(WHATSAPP_VERIFY_TOKEN),
      meta_signature: Boolean(META_APP_SECRET),
    },
    orchestration: {
      queue_db: Boolean(supabase()),
      cron_jobs: CRON_JOBS.map((job) => job.key),
    },
    checks,
  });
});

function verifyWhatsAppWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  logEvent('webhook_verify_hit', {
    path: req.path,
    mode,
    token_match: verifyToken === WHATSAPP_VERIFY_TOKEN,
    has_challenge: Boolean(challenge),
  });

  if (mode === 'subscribe' && verifyToken === WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(String(challenge ?? ''));
  }

  return res.status(403).json({ ok: false, error: 'Webhook verification failed.' });
}

app.get('/webhook', verifyWhatsAppWebhook);
app.get('/webhooks/whatsapp', verifyWhatsAppWebhook);

async function receiveWhatsAppWebhook(req, res) {
  const entries = Array.isArray(req.body?.entry) ? req.body.entry.length : 0;
  const changes = Array.isArray(req.body?.entry?.[0]?.changes) ? req.body.entry[0].changes.length : 0;
  const firstChange = req.body?.entry?.[0]?.changes?.[0] || {};
  const firstValue = firstChange?.value || {};
  const messageCount = req.body?.entry?.reduce((count, entry) => {
    return count + (entry?.changes || []).reduce((innerCount, change) => {
      return innerCount + (change?.value?.messages || []).length;
    }, 0);
  }, 0) || 0;
  const statusCount = req.body?.entry?.reduce((count, entry) => {
    return count + (entry?.changes || []).reduce((innerCount, change) => {
      return innerCount + (change?.value?.statuses || []).length;
    }, 0);
  }, 0) || 0;
  logEvent('webhook_post_hit', {
    path: req.path,
    has_signature: Boolean(req.header('x-hub-signature-256')),
    object: req.body?.object || null,
    field: firstChange?.field || null,
    value_keys: Object.keys(firstValue),
    entries,
    changes,
    message_count: messageCount,
    status_count: statusCount,
  });

  if (!validateMetaSignature(req)) {
    logEvent('webhook_signature_invalid', {
      path: req.path,
      has_signature: Boolean(req.header('x-hub-signature-256')),
      raw_body_bytes: Buffer.byteLength(req.rawBody || '', 'utf8'),
    });
    return res.status(401).json({ ok: false, error: 'Invalid Meta signature.' });
  }

  try {
    await withTimeout(handleWhatsAppWebhook(req.body), WEBHOOK_HANDLER_TIMEOUT_MS, 'whatsapp_webhook');
    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error?.code === 'timeout') {
      const to = extractFirstIncomingPhone(req.body);
      const fallback = await sendWebhookTimeoutFallback(to);
      logEvent('handler_timeout', {
        phone: to ? `***${to.slice(-4)}` : null,
        fallback,
      });
      return res.status(200).json({
        ok: true,
        fallback_sent: fallback.ok === true,
        fallback,
        reason: 'handler_timeout',
      });
    }

    logEvent('webhook_failed', { error: error.message });
    return res.status(500).json({ ok: false, error: 'Webhook processing failed.' });
  }
}

app.post('/webhook', receiveWhatsAppWebhook);
app.post('/webhooks/whatsapp', receiveWhatsAppWebhook);

app.use(requireSecret);

app.post('/route', async (req, res) => {
  const started = Date.now();
  const parsed = routeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const ctx = normalizeRouteInput(parsed.data);
  const decision = buildRouteDecision(ctx);
  let dispatch = null;

  try {
    if (ctx.execute && decision.ready) {
      dispatch = await agentFetch(decision.target_agent, decision.endpoint, decision.payload);
    } else if (ctx.execute && !decision.ready) {
      dispatch = {
        ok: false,
        skipped: true,
        reason: 'missing_required_context',
        missing_fields: decision.missing_fields,
      };
    }

    await logRun({
      builderId: ctx.builderId,
      action: 'route',
      input: req.body,
      output: { decision, dispatch },
      status: dispatch?.ok === false && !dispatch?.skipped ? 'failure' : 'success',
      durationMs: Date.now() - started,
      error: dispatch?.ok === false && !dispatch?.skipped ? dispatch.reason || dispatch.error || null : null,
    });

    logEvent('route_completed', {
      intent: decision.intent,
      target_agent: decision.target_agent,
      executed: ctx.execute,
    });

    return res.json({
      ok: true,
      route: decision,
      dispatch,
    });
  } catch (error) {
    await logRun({
      builderId: ctx.builderId,
      action: 'route',
      input: req.body,
      output: { decision },
      status: 'failure',
      durationMs: Date.now() - started,
      error: error.message,
    });
    return res.status(502).json({ ok: false, route: decision, error: error.message });
  }
});

app.post('/dispatch', async (req, res) => {
  const started = Date.now();
  const parsed = dispatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  try {
    const payload = parsed.data.payload || {};
    const result = await agentFetch(parsed.data.target_agent, parsed.data.endpoint, payload);

    await logRun({
      builderId: payload.builder_id || DEFAULT_BUILDER_ID || null,
      action: `dispatch:${parsed.data.target_agent}${parsed.data.endpoint}`,
      input: parsed.data,
      output: result,
      durationMs: Date.now() - started,
    });

    return res.json({
      ok: true,
      target_agent: parsed.data.target_agent,
      endpoint: parsed.data.endpoint,
      result,
    });
  } catch (error) {
    return res.status(502).json({ ok: false, error: error.message });
  }
});

app.post('/queue/enqueue', async (req, res) => {
  const parsed = queueEnqueueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const sb = supabase();
  if (!sb) {
    return res.status(503).json({ ok: false, error: 'supabase not configured for queue operations' });
  }

  const payload = parsed.data;
  const row = {
    builder_id: payload.builder_id,
    project_id: payload.project_id ?? null,
    lead_id: payload.lead_id ?? null,
    resident_id: payload.resident_id ?? null,
    source: payload.source ?? 'system',
    target_agent: payload.target_agent,
    endpoint: payload.endpoint,
    dedupe_key: payload.dedupe_key ?? null,
    payload: payload.payload ?? {},
    scheduled_for: payload.scheduled_for ?? new Date().toISOString(),
    max_attempts: payload.max_attempts ?? 3,
  };

  if (payload.dedupe_key) {
    const { data: existing } = await sb
      .from('agent_dispatch_queue')
      .select('*')
      .eq('builder_id', payload.builder_id)
      .eq('dedupe_key', payload.dedupe_key)
      .maybeSingle();

    if (existing) {
      return res.json({ ok: true, queued: existing, duplicate: true });
    }
  }

  const { data, error } = await sb.from('agent_dispatch_queue').insert(row).select('*').single();
  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(201).json({ ok: true, queued: data });
});

app.post('/queue/drain', async (req, res) => {
  const parsed = queueDrainSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const sb = supabase();
  if (!sb) {
    return res.status(503).json({ ok: false, error: 'supabase not configured for queue operations' });
  }

  const limit = parsed.data.limit ?? 25;
  const dryRun = parsed.data.dry_run === true;

  const { data: due, error } = await sb
    .from('agent_dispatch_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(limit);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  if (dryRun) {
    return res.json({
      ok: true,
      dry_run: true,
      picked: due?.length ?? 0,
      queue: due ?? [],
    });
  }

  const results = [];
  for (const job of due ?? []) {
    const started = Date.now();
    await sb
      .from('agent_dispatch_queue')
      .update({
        status: 'processing',
        locked_at: new Date().toISOString(),
        attempts: (job.attempts ?? 0) + 1,
      })
      .eq('id', job.id);

    try {
      const result = await agentFetch(job.target_agent, job.endpoint, job.payload ?? {});
      await sb.from('agent_dispatch_queue').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result,
        last_error: null,
      }).eq('id', job.id);

      await logRun({
        builderId: job.builder_id,
        action: `queue:${job.target_agent}${job.endpoint}`,
        input: job.payload ?? {},
        output: result,
        durationMs: Date.now() - started,
      });

      results.push({ id: job.id, ok: true, target_agent: job.target_agent, endpoint: job.endpoint, result });
    } catch (dispatchError) {
      const attempts = (job.attempts ?? 0) + 1;
      const nextStatus = attempts >= (job.max_attempts ?? 3) ? 'failed' : 'pending';
      await sb.from('agent_dispatch_queue').update({
        status: nextStatus,
        last_error: dispatchError.message,
        result: {},
      }).eq('id', job.id);

      await logRun({
        builderId: job.builder_id,
        action: `queue:${job.target_agent}${job.endpoint}`,
        input: job.payload ?? {},
        output: {},
        status: 'failure',
        durationMs: Date.now() - started,
        error: dispatchError.message,
      });

      results.push({ id: job.id, ok: false, target_agent: job.target_agent, endpoint: job.endpoint, error: dispatchError.message, status: nextStatus });
    }
  }

  return res.json({ ok: true, drained: results.length, results });
});

app.post('/cron/run-job', async (req, res) => {
  const parsed = cronRunSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const cronKey = parsed.data.cron_key;

  // Phase 5: check internal (Summoner-native) cron jobs first
  const internalJob = INTERNAL_CRON_JOBS.find((j) => j.key === cronKey);
  if (internalJob) {
    if (parsed.data.dry_run) {
      return res.json({ ok: true, dry_run: true, job: { key: cronKey, internal: true } });
    }
    const started = Date.now();
    try {
      const result = await internalJob.run();
      await logCronRun({ cronKey, targetAgent: 'summoner-internal', input: {}, output: result, durationMs: Date.now() - started });
      return res.json({ ok: true, job: cronKey, result });
    } catch (err) {
      await logCronRun({ cronKey, targetAgent: 'summoner-internal', input: {}, output: {}, status: 'failure', durationMs: Date.now() - started, error: err.message });
      return res.status(502).json({ ok: false, job: cronKey, error: err.message });
    }
  }

  const job = CRON_JOBS.find((entry) => entry.key === cronKey);
  if (!job) {
    return res.status(404).json({ ok: false, error: 'unknown cron_key' });
  }


  const input = {
    limit: parsed.data.limit ?? 25,
    builderId: parsed.data.builder_id ?? null,
    projectId: parsed.data.project_id ?? null,
    month: parsed.data.month ?? null,
  };

  if (parsed.data.dry_run) {
    return res.json({
      ok: true,
      dry_run: true,
      job: {
        key: job.key,
        target_agent: job.target_agent,
        endpoint: job.endpoint,
        payload: job.buildPayload(input),
      },
    });
  }

  const started = Date.now();
  try {
    const result = await agentFetch(job.target_agent, job.endpoint, job.buildPayload(input));
    await logCronRun({
      builderId: input.builderId,
      cronKey: job.key,
      targetAgent: job.target_agent,
      input,
      output: result,
      durationMs: Date.now() - started,
    });
    return res.json({ ok: true, job: job.key, result });
  } catch (error) {
    await logCronRun({
      builderId: input.builderId,
      cronKey: job.key,
      targetAgent: job.target_agent,
      input,
      output: {},
      status: 'failure',
      durationMs: Date.now() - started,
      error: error.message,
    });
    return res.status(502).json({ ok: false, job: job.key, error: error.message });
  }
});

app.post('/cron/run-all', async (req, res) => {
  const parsed = cronRunSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const include = new Set(parsed.data.include ?? []);
  const exclude = new Set(parsed.data.exclude ?? []);
  const selected = CRON_JOBS.filter((job) => {
    if (include.size && !include.has(job.key)) return false;
    if (exclude.has(job.key)) return false;
    return true;
  });

  const input = {
    limit: parsed.data.limit ?? 25,
    builderId: parsed.data.builder_id ?? null,
    projectId: parsed.data.project_id ?? null,
    month: parsed.data.month ?? null,
  };

  if (parsed.data.dry_run) {
    return res.json({
      ok: true,
      dry_run: true,
      jobs: selected.map((job) => ({
        key: job.key,
        target_agent: job.target_agent,
        endpoint: job.endpoint,
        payload: job.buildPayload(input),
      })),
    });
  }

  const results = [];
  for (const job of selected) {
    const started = Date.now();
    try {
      const result = await agentFetch(job.target_agent, job.endpoint, job.buildPayload(input));
      await logCronRun({
        builderId: input.builderId,
        cronKey: job.key,
        targetAgent: job.target_agent,
        input,
        output: result,
        durationMs: Date.now() - started,
      });
      results.push({ key: job.key, ok: true, result });
    } catch (error) {
      await logCronRun({
        builderId: input.builderId,
        cronKey: job.key,
        targetAgent: job.target_agent,
        input,
        output: {},
        status: 'failure',
        durationMs: Date.now() - started,
        error: error.message,
      });
      results.push({ key: job.key, ok: false, error: error.message });
    }
  }

  const failed = results.filter((item) => item.ok === false).length;
  return res.json({
    ok: failed === 0,
    status: failed === 0 ? 'success' : failed === results.length ? 'failure' : 'partial',
    jobs: results,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase 5: Revenue endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /trial/upgrade-prompt
 * Records that an upgrade nudge was shown to a business and returns plan options.
 */
app.post('/trial/upgrade-prompt', async (req, res) => {
  const { business_id } = req.body ?? {};
  if (!business_id) {
    return res.status(400).json({ ok: false, error: 'business_id is required' });
  }

  const sb = supabase();
  if (sb) {
    try {
      await sb.from('business_subscriptions')
        .update({ upgrade_prompted_at: new Date().toISOString() })
        .eq('business_id', business_id);
    } catch {
      // non-fatal
    }
  }

  return res.json({
    ok: true,
    business_id,
    plans: [
      {
        key: 'basic',
        name: 'Basic',
        price_inr: 2999,
        setup_fee_inr: 5000,
        features: ['WhatsApp receptionist 24/7', '1 vertical playbook', 'Lead qualification', 'Follow-up queue', 'Daily summary'],
        limits: { messages_per_day: 150, contacts: 500 },
        cta: 'Start Basic — ₹2,999/mo',
      },
      {
        key: 'growth',
        name: 'Growth',
        price_inr: 7999,
        setup_fee_inr: 10000,
        features: ['Everything in Basic', '2 vertical playbooks', 'Handoff SLA alerts', 'Appointment booking', 'CSV export'],
        limits: { messages_per_day: 500, contacts: 2000 },
        cta: 'Upgrade to Growth — ₹7,999/mo',
        badge: 'Most Popular',
      },
      {
        key: 'pro',
        name: 'Pro',
        price_inr: 14999,
        setup_fee_inr: 25000,
        features: ['Everything in Growth', '5 vertical playbooks', 'Custom playbook editor', 'White-label dashboard', 'Dedicated onboarding'],
        limits: { messages_per_day: 2000, contacts: 10000 },
        cta: 'Go Pro — ₹14,999/mo',
      },
    ],
  });
});

/**
 * GET /trial/status/:businessId
 * Returns the current trial/subscription state for a business.
 */
app.get('/trial/status/:businessId', async (req, res) => {
  const { businessId } = req.params;
  const sb = supabase();
  if (!sb) return res.status(503).json({ ok: false, error: 'supabase_not_configured' });

  const { data: sub } = await sb
    .from('business_subscriptions')
    .select('*, subscription_plans(key, name, price_inr, limits, features)')
    .eq('business_id', businessId)
    .maybeSingle();

  const { data: usage } = await sb
    .from('business_usage')
    .select('messages_in, messages_out, handoffs')
    .eq('business_id', businessId)
    .eq('date', new Date().toISOString().split('T')[0])
    .maybeSingle();

  const { data: checklist } = await sb
    .from('business_setup_checklist')
    .select('step_key, step_label, is_done')
    .eq('business_id', businessId)
    .order('created_at');

  return res.json({
    ok: true,
    subscription: sub ?? null,
    today_usage: usage ?? { messages_in: 0, messages_out: 0, handoffs: 0 },
    setup_checklist: checklist ?? [],
  });
});

app.use((error, _req, res, _next) => {

  logEvent('unhandled_error', { error: error?.message || 'unknown error' });
  res.status(500).json({ ok: false, error: error?.message || 'internal error' });
});

app.listen(PORT, () => {
  logEvent('listening', { port: PORT });
});
