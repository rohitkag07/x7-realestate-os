import express from 'express';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const PORT = Number(process.env.PORT || 8082);
const AGENT_SECRET = process.env.AGENT_SECRET || '';
const DEFAULT_BUILDER_ID = process.env.DEFAULT_BUILDER_ID || '';
const DEFAULT_PROJECT_ID = process.env.DEFAULT_PROJECT_ID || '';
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';

const AGENT_TARGETS = {
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
function supabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
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
  if (req.path === '/health' || req.path === '/health/dependencies' || req.path === '/webhooks/whatsapp') return next();
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
  if (!META_APP_SECRET) return true;

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

  await sb.from('whatsapp_messages').upsert({
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
  }, {
    onConflict: 'wa_message_id',
    ignoreDuplicates: false,
  });
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

  if (!body && !message?.interactive?.button_reply?.title && !message?.interactive?.list_reply?.title) {
    return { ok: true, skipped: true, reason: 'empty_body' };
  }

  if (resident) {
    const result = await agentFetch('colony', '/inbound', {
      message: {
        text: body,
        button_reply_id: message?.interactive?.button_reply?.id ?? message?.button?.payload ?? undefined,
      },
      resident,
      builder: builderId ? { id: builderId } : undefined,
    });

    await logRun({
      builderId,
      action: 'webhook-inbound-colony',
      input: {
        from: phone,
        body,
        message_type: message.type,
        metadata: envelope?.metadata ?? null,
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
  });

  await logRun({
    builderId,
    action: 'webhook-inbound-sales',
    input: {
      from: phone,
      body,
      message_type: message.type,
      metadata: envelope?.metadata ?? null,
    },
    output: result,
  });

  return result;
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

app.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const verifyToken = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && verifyToken === WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(String(challenge ?? ''));
  }

  return res.status(403).json({ ok: false, error: 'Webhook verification failed.' });
});

app.post('/webhooks/whatsapp', async (req, res) => {
  if (!validateMetaSignature(req)) {
    return res.status(401).json({ ok: false, error: 'Invalid Meta signature.' });
  }

  await handleWhatsAppWebhook(req.body);
  return res.status(200).json({ ok: true });
});

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

app.use((error, _req, res, _next) => {
  logEvent('unhandled_error', { error: error?.message || 'unknown error' });
  res.status(500).json({ ok: false, error: error?.message || 'internal error' });
});

app.listen(PORT, () => {
  logEvent('listening', { port: PORT });
});
